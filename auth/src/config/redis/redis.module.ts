import { Module } from '@nestjs/common';
import { redisOptionsModuleFactory } from './redis.config';
import { createRedisConnection } from './redis.service';
import { REDIS_MODULE_OPTIONS, REDIS_TOKEN } from './redis.constant';

const config = redisOptionsModuleFactory();

@Module({
  providers: [
    {
      provide: REDIS_MODULE_OPTIONS,
      useValue: config,
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
