import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';

import { DeepPartial, Repository } from 'typeorm';

export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async createUser<T extends DeepPartial<UserEntity>>(entity: T): Promise<T> {
    return this.userRepository.save(entity);
  }
}
