import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from './entities/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';

import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../config/redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), DatabaseModule, RedisModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
})
export class UserModule {}
