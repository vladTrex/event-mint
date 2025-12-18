import * as argon from 'argon2';
import * as crypto from 'node:crypto';
import Redis from 'ioredis';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SignInDto } from './dto/sign-in.dto';
import { UserRepository } from './user.repository';
import { GetUsersFilterDto } from './dto/get-user-filter.dto';
import { UserDto } from './dto/user.dto';
import { UserEntity } from './entities/user.entity';
import { REDIS_TOKEN } from '../config/redis/redis.constant';

@Injectable()
export class UserService {
  constructor(
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    private readonly userRepository: UserRepository,
  ) {}

  async create(user: CreateUserDto): Promise<void> {
    const salt = crypto.randomBytes(32);
    const hash = await argon.hash(user.password, { salt });

    await this.userRepository.createUser({
      passwordHash: hash,
      passwordSalt: salt.toString('hex'),
      ...user,
    });
  }

  async findAll(
    getUserFilterDto: GetUsersFilterDto,
  ): Promise<{ items: UserDto[]; total: number }> {
    const { items: users, total } =
      await this.userRepository.findAndCount(getUserFilterDto);
    const dtos = users.map((user: UserEntity) => new UserDto(user));

    return { items: dtos, total };
  }

  findOne(id: string) {
    return this.userRepository.findById(id);
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.userRepository.updateUser({ userId: id, ...updateUserDto });
  }

  async remove(id: string) {
    const user = await this.userRepository.findById(id);
    await this.redis.del(user.login);

    return this.userRepository.deleteUser(id);
  }

  async verification({ login, password }: SignInDto): Promise<boolean> {
    const user = await this.userRepository.findByLogin(login);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await argon.verify(user.passwordHash, password);

    if (!isValid) {
      throw new UnauthorizedException('Invalid password');
    }

    return true;
  }
}
