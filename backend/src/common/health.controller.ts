import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        db: 'up',
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: 'degraded',
        db: 'down',
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
