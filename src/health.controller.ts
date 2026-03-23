import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { CacheService } from './common/cache-manager/cache.service';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
    private memory: MemoryHealthIndicator,
    private cacheService: CacheService,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const redisIsReady = this.cacheService.client.status === 'ready';
    const data = await this.health.check([
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch (error) {
          return { database: { status: 'down', message: error.message } };
        }
      },
      () => this.memory.checkRSS('mem_rss', 1024 * 2 ** 20 /* 1024 MB */),
    ]);

    if (redisIsReady) {
      data.info['redis'] = { status: 'up' };
      data.details['redis'] = {
        status: 'up',
      };
    } else {
      data.status = 'error';
      data.error['redis'] = { status: 'down' };
      data.details['redis'] = {
        status: 'down',
      };
    }

    return data;
  }
}
