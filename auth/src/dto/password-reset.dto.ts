import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Account e-mail', required: true, type: String })
  @IsString()
  @IsNotEmpty()
  readonly email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token', required: true, type: String })
  @IsString()
  @IsNotEmpty()
  readonly token: string;

  @ApiProperty({ description: 'New password', required: true, type: String })
  @IsString()
  readonly password: string;
}
