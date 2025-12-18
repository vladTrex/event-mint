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

    const payload = { login: params.login, userId };
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
    let jwtPayload: {
      userId: string;
      login: string;
    };

    try {
      jwtPayload = this.jwtService.verify(params.refresh, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        algorithms: [this.configService.get('JWT_ALG')],
      });
    } catch (error: unknown) {
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

    const payload = { login: users[0].login, userId: users[0].userId };
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
}
