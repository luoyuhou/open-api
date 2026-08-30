import { Injectable } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { UsersFetchService } from '../users/users-fetch/users-fetch.service';
import customLogger from '../common/logger';
import { PrismaService } from '../prisma/prisma.service';
import { STORE_STATUS_TYPES } from '../store/const';

/** 人为可读的调度元信息（按 @Cron name） */
const CRON_META: Record<string, { title: string; description: string }> = {
  'heartbeat-log': {
    title: '心跳日志',
    description: '每分钟打印一次定时任务心跳',
  },
  'user-daily-fetch': {
    title: '用户日活拉取',
    description: '每天统计并落库用户访问数据',
  },
  'store-ratings-refresh': {
    title: '门店评分刷新',
    description: '预计算门店评分与订单数写入 store_rating',
  },
  'store-daily-order-report': {
    title: '门店订单日报',
    description: '统计前一日各门店订单与商品消耗',
  },
  'store-service-monthly-invoice': {
    title: '店铺服务月账单',
    description: '为生效订阅生成当月账单',
  },
  'online-user-snapshot': {
    title: '在线人数采样',
    description: '每 5 分钟采样平台在线人数',
  },
  'store-monthly-settlement': {
    title: '商家月度结算',
    description: '每月 1 日生成上月商家结算',
  },
  'platform-monthly-settlement': {
    title: '平台月度结算',
    description: '每月 1 日生成上月平台结算',
  },
};

@Injectable()
export class SchedulesService {
  constructor(
    private readonly usersFetchService: UsersFetchService,
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  listCronJobs() {
    const jobs = this.schedulerRegistry.getCronJobs();
    const rows: {
      name: string;
      title: string;
      description: string;
      cron: string;
      running: boolean;
      lastDate: Date | null;
      nextDate: Date | null;
    }[] = [];

    jobs.forEach((job: CronJob, name: string) => {
      const meta = CRON_META[name] || {
        title: name,
        description: '',
      };

      let nextDate: Date | null = null;
      try {
        const next = job.nextDate();
        nextDate =
          next &&
          typeof (next as { toJSDate?: () => Date }).toJSDate === 'function'
            ? (next as { toJSDate: () => Date }).toJSDate()
            : next
            ? new Date(String(next))
            : null;
      } catch {
        nextDate = null;
      }

      const last = job.lastDate();
      rows.push({
        name,
        title: meta.title,
        description: meta.description,
        cron: String(job.cronTime.source),
        running: Boolean(job.running),
        lastDate: last ? new Date(last) : null,
        nextDate,
      });
    });

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'heartbeat-log' })
  handleCron() {
    customLogger.log({ message: '执行定时任务' });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'user-daily-fetch' })
  reportUserDailyFetch() {
    this.usersFetchService.dailyUsersFetch();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'store-ratings-refresh',
  })
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
      const rating = orderCount;
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
