import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { InternalAccountService } from './internal/account/account.service';
import { JwtDto, RefreshJwtDto } from './dto/jwt.dto';
import { SignInDto } from './dto/sign-in.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly internalAccountService: InternalAccountService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(signInDto: SignInDto): Promise<JwtDto> {
    const isPasswordValid =
      await this.internalAccountService.verification(signInDto);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const users = await this.internalAccountService.getUsersByFilter({
      login: signInDto.login,
    });

    if (users.total === 0) {
      throw new UnauthorizedException('User not found');
    }

    const payload = {
      login: signInDto.login,
      userId: users.items[0].userId,
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
    return { access, refresh };
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

    if (users.length) {
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
