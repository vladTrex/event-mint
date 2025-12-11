import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { IsString } from 'class-validator';
import { UserEntity } from '../entities/user.entity';

export class UserDto {
  @ApiProperty({
    description: 'User identifier',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'User login',
    required: true,
    type: String,
  })
  @Expose()
  @IsString()
  login: string;

  @ApiProperty({
    description: 'User phone number',
    required: true,
    type: String,
  })
  phone: string;

  @ApiProperty({
    description: 'User firstname',
    required: true,
    type: String,
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'User lastname',
    required: true,
    type: String,
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'User e-mail address',
    required: true,
    type: String,
  })
  email: string;

  constructor(entity: Partial<UserEntity>) {
    return plainToInstance(UserDto, entity, {
      excludeExtraneousValues: true,
    });
  }
}
