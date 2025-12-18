import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersFilterDto } from './dto/get-user-filter.dto';
import { SignInDto } from './dto/sign-in.dto';
import { UserDto } from './dto/user.dto';

@ApiExtraModels(GetUsersFilterDto, SignInDto)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of users with pagination',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserDto' },
        },
        total: {
          type: 'number',
          example: 100,
        },
      },
    },
  })
  findAll(
    @Query() getUserFilterDto: GetUsersFilterDto,
  ): Promise<{ items: UserDto[]; total: number }> {
    return this.userService.findAll(getUserFilterDto);
  }

  @Get('verification')
  verification(@Query() signInDto: SignInDto): Promise<boolean> {
    return this.userService.verification(signInDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
