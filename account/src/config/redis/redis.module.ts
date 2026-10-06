import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { redisOptionsModuleFactory } from './redis.config';
import { RedisModuleOptions } from './redis.interface';
import { REDIS_MODULE_OPTIONS, REDIS_TOKEN } from './redis.constant';

const config = redisOptionsModuleFactory();

function createRedisConnection({ config }: RedisModuleOptions): Redis {
  return config?.url ? new Redis(config.url, config) : new Redis(config);
}
const { url } = config.config;

@Module({
  providers: [
    {
      provide: REDIS_MODULE_OPTIONS,
      useValue: {
        url: url,
      },
    },
    {
      inject: [REDIS_MODULE_OPTIONS],
      provide: REDIS_TOKEN,
      useFactory: async () => {
        const client = createRedisConnection(config);
        return client;
      },
    },
  ],
  exports: [REDIS_TOKEN],
})
export class RedisModule {}
