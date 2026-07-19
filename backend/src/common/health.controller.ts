import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from './cache/cache.module';

// /api/health is what load balancers, uptime monitors, and PagerDuty watch.
// It runs every dependency probe in parallel and returns 200 only when the
// hard dependencies (DB) are up. Redis is soft — a degraded cache does not
// fail the health check but is reported so operators can see it.

interface DepStatus {
  status: 'up' | 'down' | 'disabled';
  latencyMs?: number;
  error?: string;
}

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  @Get('health')
  @HttpCode(200)
  async health(@Res({ passthrough: true }) res: Response) {
    const [db, redis] = await Promise.all([this.probeDb(), this.probeRedis()]);

    const status = db.status === 'up' ? 'ok' : 'degraded';
    // DB is hard-required; if it's down return 503 so LBs pull us out of rotation.
    if (db.status !== 'up') res.status(503);

    return {
      status,
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? 'unknown',
      dependencies: { db, redis },
    };
  }

  private async probeDb(): Promise<DepStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: (err as Error).message,
      };
    }
  }

  private async probeRedis(): Promise<DepStatus> {
    const start = Date.now();
    const state = await this.cache.probe();
    return {
      status: state,
      ...(state !== 'disabled' ? { latencyMs: Date.now() - start } : {}),
    };
  }
}
