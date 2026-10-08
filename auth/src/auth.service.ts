import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import { InternalAccountService } from './internal/account/account.service';
import { JwtDto, RefreshJwtDto } from './dto/jwt.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { REDIS_TOKEN } from './config/redis/redis.constant';
type RefreshPayload = {
  userId: string;
  login: string;
  sid: string;
  ep: number;
  exp: number;
};

const RESET_TTL = 900; // 15 minutes

const revokedKey = (sid: string) => `revoked:sid:${sid}`;
// bumped on every password reset; copied into JWTs as `ep`
const epochKey = (userId: string) => `session:epoch:${userId}`;
const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const resetTokenKey = (hash: string) => `reset:token:${hash}`;
const resetUserKey = (userId: string) => `reset:user:${userId}`;
const devResetKey = (userId: string) => `dev:reset-token:${userId}`;

@Injectable()
export class AuthService {
  constructor(
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    private readonly internalAccountService: InternalAccountService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(params: SignInDto): Promise<JwtDto> {
    const isPasswordCorrect =
      await this.internalAccountService.verification(params);

    if (!isPasswordCorrect) {
      throw new UnauthorizedException();
    }

    let userId = await this.redis.get(params.login);

    if (!userId) {
      const users = await this.internalAccountService.getUsersByFilter({
        login: params.login,
      });
      userId = users.items[0].userId;

      await this.redis.set(params.login, userId, 'PX', 86400);
    }

    const payload = {
      login: params.login,
      userId,
      sid: randomUUID(),
      ep: await this.currentEpoch(userId),
    };
    const access = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      algorithm: this.configService.get('JWT_ALG'),
      expiresIn: this.configService.get('JWT_ACCESS_EXP'),
    });
    const refresh = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      algorithm: this.configService.get('JWT_ALG'),
      expiresIn: this.configService.get('JWT_REFRESH_EXP'),
    });

    return {
      access,
      refresh,
    };
  }

  async refreshToken(params: RefreshJwtDto): Promise<JwtDto> {
    const jwtPayload = this.verifyRefresh(params.refresh);

    if (
      (await this.redis.exists(revokedKey(jwtPayload.sid))) ||
      jwtPayload.ep !== (await this.currentEpoch(jwtPayload.userId))
    ) {
      throw new UnauthorizedException();
    }

    const { items: users } = await this.internalAccountService.getUsersByFilter(
      {
        userIds: [jwtPayload.userId],
      },
    );

    if (users.length === 0) {
      throw new NotFoundException('user not found');
    }

    const payload = {
      login: users[0].login,
      userId: users[0].userId,
      sid: jwtPayload.sid,
      ep: jwtPayload.ep,
    };
    const access = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      algorithm: this.configService.get('JWT_ALG'),
      expiresIn: this.configService.get('JWT_ACCESS_EXP'),
    });
    const refresh = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      algorithm: this.configService.get('JWT_ALG'),
      expiresIn: this.configService.get('JWT_REFRESH_EXP'),
    });

    return {
      access,
      refresh,
    };
  }

  async logout(params: RefreshJwtDto): Promise<void> {
    const { sid, exp } = this.verifyRefresh(params.refresh);
    const ttl = exp - Math.floor(Date.now() / 1000);

    // ttl <= 0: the token expires this second, nothing left to revoke
    if (ttl > 0) {
      await this.redis.set(revokedKey(sid), '1', 'EX', ttl);
    }
  }

  async requestPasswordReset({ email }: ForgotPasswordDto): Promise<void> {
    const { items } = await this.internalAccountService.getUsersByFilter({
      email,
    });

    // unknown email: same silent success, nothing stored
    if (!items[0]) {
      return;
    }

    const { userId } = items[0];
    const token = randomBytes(32).toString('hex');
    const hash = hashToken(token);
    const previous = await this.redis.get(resetUserKey(userId));
    const tx = this.redis.multi();

    if (previous) {
      tx.del(resetTokenKey(previous));
    }
    tx.set(resetTokenKey(hash), userId, 'EX', RESET_TTL);
    tx.set(resetUserKey(userId), hash, 'EX', RESET_TTL);
    // no email provider yet: outside production the token is readable from Redis
    if (this.configService.get('NODE_ENV') !== 'production') {
      tx.set(devResetKey(userId), token, 'EX', RESET_TTL);
    }
    await tx.exec();
  }

  async resetPassword({ token, password }: ResetPasswordDto): Promise<void> {
    // GETDEL: exactly one caller can consume a token
    const userId = await this.redis.getdel(resetTokenKey(hashToken(token)));

    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // drop sessions first: if setPassword fails nothing changed but sessions
    await this.redis.incr(epochKey(userId));
    await this.internalAccountService.setPassword(userId, password);

    await this.redis
      .del(resetUserKey(userId), devResetKey(userId))
      .catch(() => undefined);
  }

  private async currentEpoch(userId: string): Promise<number> {
    return Number(await this.redis.get(epochKey(userId))) || 0;
  }

  private verifyRefresh(token: string): RefreshPayload {
    let payload: RefreshPayload;

    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        algorithms: [this.configService.get('JWT_ALG')],
      });
    } catch (error: unknown) {
      throw new UnauthorizedException();
    }

    // tokens issued before sessions / epochs existed carry no sid / ep
    if (!payload.sid || typeof payload.ep !== 'number') {
      throw new UnauthorizedException();
    }

    return payload;
  }
}
