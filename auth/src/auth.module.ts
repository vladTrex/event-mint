import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InternalAccountService } from './internal/account/account.service';

@Module({
  imports: [HttpModule],
  controllers: [AuthController],
  providers: [AuthService, InternalAccountService],
})
export class AuthModule {}
