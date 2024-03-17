import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import redisClient from './common/client/redisClient';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private orm: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const redisIsReady = redisClient.status === 'ready';
    const data = await this.health.check([
      () => this.orm.pingCheck('database', { timeout: 300 }),
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
