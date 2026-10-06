import { randomUUID } from 'node:crypto';
import {
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
import { REDIS_TOKEN } from './config/redis/redis.constant';
type RefreshPayload = {
  userId: string;
  login: string;
  sid: string;
  exp: number;
};

const revokedKey = (sid: string) => `revoked:sid:${sid}`;

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

    const payload = { login: params.login, userId, sid: randomUUID() };
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

    if (await this.redis.exists(revokedKey(jwtPayload.sid))) {
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

    // tokens issued before sessions existed carry no sid
    if (!payload.sid) {
      throw new UnauthorizedException();
    }

    return payload;
  }
}
