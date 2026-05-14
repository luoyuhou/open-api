import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersFetchService } from '../users/users-fetch/users-fetch.service';
import customLogger from '../common/logger';
import { PrismaService } from '../prisma/prisma.service';
import { STORE_STATUS_TYPES } from '../store/const';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly usersFetchService: UsersFetchService,
    private readonly prisma: PrismaService,
  ) {}

  // 每 1minus 执行一次
  @Cron(CronExpression.EVERY_MINUTE)
  handleCron() {
    customLogger.log({ message: '执行定时任务' });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  reportUserDailyFetch() {
    this.usersFetchService.dailyUsersFetch().then();
  }

  // 每天凌晨 0 点预计算各门店的评分和订单数，写入 store_rating 表
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshStoreRatings() {
    customLogger.log({ message: '开始刷新门店评分统计（store_rating）' });

    const rows = await this.prisma.$queryRaw<
      { store_id: string; order_count: number }[]
    >`SELECT
        s.store_id,
        COUNT(u.order_id) AS order_count
      FROM store AS s
      LEFT JOIN user_order AS u ON s.store_id = u.store_id
      WHERE s.status >= ${STORE_STATUS_TYPES.APPROVED}
      GROUP BY s.store_id`;

    const now = new Date();

    for (const row of rows) {
      const orderCount = Number(row.order_count) || 0;
      const rating = orderCount; // 排序用热度值，仍然用订单总数
      // 把订单数映射到 3.5~5.0 范围内的星级分，供前端展示
      const avgStar =
        orderCount === 0 ? 4.5 : Math.min(5, 3.5 + orderCount / 20);

      await this.prisma.store_rating.upsert({
        where: { store_id: row.store_id },
        update: {
          rating,
          order_count: orderCount,
          avg_star: avgStar,
          updated_at: now,
        },
        create: {
          store_id: row.store_id,
          rating,
          order_count: orderCount,
          avg_star: avgStar,
        },
      });
    }

    customLogger.log({ message: '门店评分统计刷新完成' });
  }
}
