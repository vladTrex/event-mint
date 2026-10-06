import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { JwtDto, RefreshJwtDto } from './dto/jwt.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: SignInDto): Promise<JwtDto> {
    return this.authService.login(dto);
  }

  @Post('refresh/token')
  refreshToken(@Body() dto: RefreshJwtDto): Promise<JwtDto> {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Body() dto: RefreshJwtDto): Promise<void> {
    return this.authService.logout(dto);
  }
}
