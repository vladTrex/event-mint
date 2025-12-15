import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User login',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  login: string;

  @ApiProperty({
    description: 'User Password',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  password: string;

  @ApiProperty({
    description: 'User phone',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'User firstname',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'User lastname',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'User E-mail',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  email: string;
}
