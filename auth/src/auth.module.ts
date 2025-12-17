import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InternalAccountService } from './internal/account/account.service';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, InternalAccountService],
})
export class AuthModule {}
