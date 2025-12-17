import { Redis } from 'ioredis';
import { RedisModuleOptions } from './redis.interface';

export function createRedisConnection(options: RedisModuleOptions): Redis {
  const { config } = options;

  if (config?.url) {
    return new Redis(config.url, config);
  }

  return new Redis(config);
}
