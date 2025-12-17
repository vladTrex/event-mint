import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class JwtDto {
  @ApiProperty({
    description: 'JWT token',
    required: true,
    type: String,
  })
  @IsString()
  access: string;

  @ApiProperty({
    description: 'JWT refresh token',
    required: true,
    type: String,
  })
  @IsString()
  refresh: string;
}

export class RefreshJwtDto {
  @ApiProperty({
    description: 'JWT refresh token',
    required: true,
    type: String,
  })
  @IsString()
  readonly refresh: string;
}
