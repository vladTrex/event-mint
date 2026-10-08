import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({
    description: 'New password',
    required: true,
    type: String,
  })
  @IsString()
  readonly password: string;
}
