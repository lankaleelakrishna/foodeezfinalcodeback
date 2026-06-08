import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { AppCacheService } from './cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST', 'localhost');
        const port = config.get<number>('REDIS_PORT', 6379);
        const password = config.get<string>('REDIS_PASSWORD');

        const url = password
          ? `rediss://:${password}@${host}:${port}`
          : `redis://${host}:${port}`;

        return {
          stores: [new KeyvRedis(url)],
          ttl: 60_000,
        };
      },
    }),
  ],
  providers: [AppCacheService],
  exports: [AppCacheService],
})
export class AppCacheModule {}
