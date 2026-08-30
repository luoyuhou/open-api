import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache-manager/cache.service';
import customLogger from '../common/logger';

@Injectable()
export class OnlineUserSnapshotCronService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /** 启动时等 Redis ready 后再采一次，避免 enableOfflineQueue=false 时报错 */
  async onModuleInit() {
    const ready = await this.cacheService.waitUntilReady(15000);
    if (!ready) {
      customLogger.warn({
        message: 'skip initial online user snapshot: redis not ready',
      });
      return;
    }
    await this.snapshotOnlineUsers();
  }

  /** 对齐到 5 分钟整点，便于同窗口 upsert */
  private floorToFiveMinutes(date = new Date()): Date {
    const d = new Date(date);
    d.setSeconds(0, 0);
    d.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
    return d;
  }

  @Cron('*/5 * * * *', { name: 'online-user-snapshot' })
  async snapshotOnlineUsers() {
    const sampledAt = this.floorToFiveMinutes();
    try {
      const userIds = await this.cacheService.getAllOnlineUserIds();
      let count = 0;
      if (userIds.length) {
        count = await this.prisma.user.count({
          where: { user_id: { in: userIds } },
        });
      }

      await this.prisma.report_online_user_snapshot.upsert({
        where: { sampled_at: sampledAt },
        create: { count, sampled_at: sampledAt },
        update: { count },
      });

      // 仅保留约 48 小时，查询近 24 小时足够
      const expireBefore = new Date(Date.now() - 48 * 60 * 60 * 1000);
      await this.prisma.report_online_user_snapshot.deleteMany({
        where: { sampled_at: { lt: expireBefore } },
      });

      customLogger.log({
        message: 'online user snapshot saved',
        count,
        sampled_at: sampledAt.toISOString(),
      });
    } catch (error) {
      customLogger.error({
        message: 'online user snapshot failed',
        error,
        sampled_at: sampledAt.toISOString(),
      });
    }
  }
}
