import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

type RedisClient = {
  connect: () => Promise<void>;
  ping: () => Promise<string>;
  get: (key: string) => Promise<string | null>;
  scan: (
    cursor: string,
    mode: 'MATCH',
    pattern: string,
    countMode: 'COUNT',
    count: number,
  ) => Promise<[string, string[]]>;
  set: (
    key: string,
    value: string,
    mode?: string,
    ttlSeconds?: number,
  ) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
  quit: () => Promise<unknown>;
};

@Injectable()
export class DashboardCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DashboardCacheService.name);
  private redis!: RedisClient;

  async onModuleInit(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RedisCtor = require('ioredis');
    const host = process.env.REDISHOST;
    const port = Number(process.env.REDISPORT ?? '6379');
    const password = process.env.REDIS_PASSWORD || undefined;

    if (!host) {
      throw new Error('REDISHOST is required for dashboard cache.');
    }

    this.redis = new RedisCtor({
      host,
      port,
      password,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    }) as RedisClient;

    await this.redis.connect();
    await this.redis.ping();
    this.logger.log(`Dashboard cache connected to Redis ${host}:${port}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.quit();
  }

  makeKey(studentId: string, type: string, weeks: number): string {
    return `dashboard:${studentId}:${type}:${weeks}`;
  }

  makeLegacyKey(studentId: string): string {
    return `dashboard:${studentId}`;
  }

  makeStudentPattern(studentId: string): string {
    return `dashboard:${studentId}:*`;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidateStudent(studentId: string): Promise<void> {
    const keys: string[] = [];
    let cursor = '0';
    const pattern = this.makeStudentPattern(studentId);
    do {
      const [nextCursor, batch] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        200,
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    const legacyKey = this.makeLegacyKey(studentId);
    const uniqueKeys = Array.from(new Set([...keys, legacyKey]));
    if (!uniqueKeys.length) return;
    await this.redis.del(...uniqueKeys);
  }
}
