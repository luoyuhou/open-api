import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import customLogger from '../common/logger';

@Injectable()
export class StoreServiceBillingCronService {
  constructor(private readonly prisma: PrismaService) {}

  // 每天凌晨 2 点检查，为所有生效中的订阅生成当月账单
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generateMonthlyInvoices() {
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth(); // 0-11
    const monthStr = `${year}-${`${monthIndex + 1}`.padStart(2, '0')}`;

    customLogger.log({ message: `开始生成店铺服务月度账单 ${monthStr}` });

    const activeSubscriptions =
      await this.prisma.store_service_subscription.findMany({
        where: {
          status: 1,
          start_date: { lte: now },
          end_date: { gte: now },
        },
        include: { plan: true },
      });

    const periodStart = new Date(year, monthIndex, 1);
    const periodEnd = new Date(year, monthIndex + 1, 0);
    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + 7);

    for (const sub of activeSubscriptions) {
      const existed = await this.prisma.store_service_invoice.findFirst({
        where: {
          subscription_id: sub.id,
          month: monthStr,
        },
      });
      if (existed) continue;

      await this.prisma.store_service_invoice.create({
        data: {
          subscription_id: sub.id,
          month: monthStr,
          start_date: periodStart,
          end_date: periodEnd,
          amount: sub.plan.monthly_fee,
          status: 0,
          due_date: dueDate,
        },
      });
    }

    // 标记逾期账单
    await this.prisma.store_service_invoice.updateMany({
      where: {
        status: 0,
        due_date: { lt: now },
      },
      data: { status: 2 },
    });

    customLogger.log({ message: `店铺服务月度账单生成完成 ${monthStr}` });
  }
}
