import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

type CacheEntry = { value: string; expiresAt: number };

@Injectable()
export class DashboardCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DashboardCacheService.name);
  private redis: {
    get: (key: string) => Promise<string | null>;
    set: (
      key: string,
      value: string,
      mode?: string,
      ttlSeconds?: number,
    ) => Promise<unknown>;
    del: (key: string) => Promise<unknown>;
    quit: () => Promise<unknown>;
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
  } | null = null;
  private readonly memory = new Map<string, CacheEntry>();

  onModuleInit(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const RedisCtor = require('ioredis');
      const host = process.env.REDISHOST;
      const port = Number(process.env.REDISPORT ?? '6379');
      const password = process.env.REDIS_PASSWORD || undefined;

      const redis = new RedisCtor({
        host,
        port,
        password,
        lazyConnect: true,
      });

      redis.on?.('error', (err: unknown) => {
        this.logger.warn(`Redis cache unavailable, using memory fallback: ${String(err)}`);
      });
      this.redis = redis;
    } catch {
      this.logger.warn('ioredis not available, using in-memory dashboard cache fallback.');
      this.redis = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.quit();
  }

  makeKey(studentId: string): string {
    return `dashboard:${studentId}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }

    const hit = this.memory.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return JSON.parse(hit.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    const payload = JSON.stringify(value);

    if (this.redis) {
      await this.redis.set(key, payload, 'EX', ttlSeconds);
      return;
    }

    this.memory.set(key, {
      value: payload,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
      return;
    }
    this.memory.delete(key);
  }
}
