import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GetUsersFilterDto {
  @ApiProperty({
    description: 'Array of user IDs to filter by',
    type: [String],
    required: false,
    example: [
      '068f8913-34d8-4b0f-b3f0-c732e855bcde',
      '51868538-077d-4f30-adda-fec6e18e4b30',
    ],
  })
  @IsOptional()
  @IsString({
    each: true,
    message: 'Fields in array "clientIds" must be strings',
  })
  readonly userIds?: string[];

  @ApiProperty({
    description: 'Array of phone numbers to filter by',
    type: [String],
    required: false,
    example: ['79001110102', '79001110103'],
  })
  @IsOptional()
  @IsString({
    each: true,
    message: 'Fields in array "userIds" must be strings',
  })
  readonly phones?: string[];

  @ApiProperty({
    description: 'User login to filter by',
    type: String,
    required: false,
    example: 'login',
  })
  @IsOptional()
  @IsString()
  readonly login?: string;

  @ApiProperty({
    description: 'Number of records to take (pagination)',
    type: Number,
    required: false,
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  readonly take?: number;

  @ApiProperty({
    description: 'Number of records to skip (pagination)',
    type: Number,
    required: false,
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  readonly skip?: number;
}
