import * as ioredis from 'ioredis';

export interface RedisModuleOptions {
  config: ioredis.RedisOptions & { url?: string };
}
