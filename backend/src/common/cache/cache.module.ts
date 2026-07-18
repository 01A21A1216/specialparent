import {
  Global,
  Injectable,
  Logger,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Small Redis-backed cache used for public read endpoints. Every operation
// swallows Redis errors and returns "no cache" — the app must remain fully
// functional even when Redis is unreachable.

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private ready = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL not set — caching disabled (pass-through)');
      return;
    }
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    this.client.on('error', (err) => {
      this.ready = false;
      // Suppress the ECONNREFUSED flood while Redis is down; log only
      // more meaningful errors.
      if (err.message && !err.message.includes('ECONNREFUSED')) {
        this.logger.warn(`Redis error: ${err.message}`);
      }
    });
    this.client.on('ready', () => {
      this.ready = true;
      this.logger.log('Redis cache connected');
    });
    try {
      await this.client.connect();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Redis connect failed — caching disabled: ${msg}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.client || !this.ready) return null;
    try {
      const raw = await this.client.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    if (!this.client || !this.ready) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSec);
    } catch {
      /* best-effort */
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || !this.ready || keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch {
      /* ignore */
    }
  }

  /**
   * Delete every key matching `pattern` using SCAN — safer than KEYS at scale.
   * Pattern uses Redis glob syntax, e.g. "resources:list:*".
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.client || !this.ready) return;
    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
        cursor = next;
      } while (cursor !== '0');
    } catch {
      /* ignore */
    }
  }
}

@Global()
@Module({
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class CacheModule {}
