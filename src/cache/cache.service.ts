import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// TTL constants in milliseconds
export const TTL = {
  SHORT: 30_000,     // 30 seconds — search, nearby listings
  MEDIUM: 120_000,   // 2 minutes  — trending, popular dishes
  LONG: 300_000,     // 5 minutes  — branch/menu details, item lists
} as const;

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger(AppCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cache.get<T>(key);
      return value ?? null;
    } catch (err) {
      this.logger.warn(`Cache GET failed for key "${key}": ${err}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlMs: number = TTL.MEDIUM): Promise<void> {
    try {
      await this.cache.set(key, value, ttlMs);
    } catch (err) {
      this.logger.warn(`Cache SET failed for key "${key}": ${err}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cache.del(key);
    } catch (err) {
      this.logger.warn(`Cache DEL failed for key "${key}": ${err}`);
    }
  }

  // Fetch from cache; on miss, call fn(), store result, and return it.
  async wrap<T>(key: string, fn: () => Promise<T>, ttlMs: number = TTL.MEDIUM): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const result = await fn();
    await this.set(key, result, ttlMs);
    return result;
  }
}
