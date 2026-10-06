import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RedisModule } from './config/redis/redis.module';
import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';
import { MetricsModule } from './metrics/metrics.module';
@Module({
  imports: [
    UserModule,
    DatabaseModule,
    ConfigModule.forRoot(),
    RedisModule,
    MetricsModule,
  ],
})
export class AppModule {}
