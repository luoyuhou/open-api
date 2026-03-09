import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import customLogger from '../common/logger';
import { E_USER_ORDER_STATUS } from '../order/const';

@Injectable()
export class StoreOrderDailyReportCronService {
  constructor(private readonly prisma: PrismaService) {}

  // 每天凌晨 1 点统计前一天各门店订单与商品消耗
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async generateStoreDailyReports() {
    const now = new Date();

    // 统计区间：昨天 00:00 ~ 今天 00:00
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 1);

    const recordDate = new Date(start);

    const logBase = {
      title: 'Generate daily report for store orders & goods',
      func: 'generateStoreDailyReports',
      start: start.toISOString(),
      end: end.toISOString(),
    };

    customLogger.log({ ...logBase, message: 'start schedule', step: '1/3' });

    // 1) 聚合门店维度订单统计
    const storeRows = await this.prisma.$queryRaw<
      {
        store_id: string;
        total_orders: bigint | number;
        total_amount: bigint | number;
      }[]
    >`SELECT
        o.store_id,
        COUNT(DISTINCT o.order_id) AS total_orders,
        SUM(o.money) AS total_amount
      FROM user_order AS o
      WHERE o.status = ${E_USER_ORDER_STATUS.active}
        AND o.create_date >= ${start}
        AND o.create_date < ${end}
      GROUP BY o.store_id`;

    for (const row of storeRows) {
      const totalOrders = Number(row.total_orders) || 0;
      const totalAmount = Number(row.total_amount) || 0;

      const existed = await this.prisma.report_store_daily_order.findFirst({
        where: { store_id: row.store_id, record_date: recordDate },
      });

      if (existed) {
        await this.prisma.report_store_daily_order.update({
          where: { id: existed.id },
          data: {
            total_orders: totalOrders,
            total_amount: totalAmount,
            record_date: recordDate,
          },
        });
      } else {
        await this.prisma.report_store_daily_order.create({
          data: {
            store_id: row.store_id,
            total_orders: totalOrders,
            total_amount: totalAmount,
            record_date: recordDate,
          },
        });
      }
    }

    customLogger.log({
      ...logBase,
      message: 'store summary finished',
      step: '2/3',
      data: { storeCount: storeRows.length },
    });

    // 2) 聚合商品维度消耗统计（按商品版本维度统计）
    const goodsRows = await this.prisma.$queryRaw<
      {
        store_id: string;
        goods_id: string;
        goods_version_id: string;
        goods_name: string;
        total_count: bigint | number;
        total_amount: bigint | number;
      }[]
    >`SELECT
        o.store_id,
        i.goods_id,
        i.goods_version_id,
        i.goods_name,
        SUM(i.count) AS total_count,
        SUM(i.price * i.count) AS total_amount
      FROM user_order AS o
      JOIN user_order_info AS i ON o.order_id = i.order_id
      WHERE o.status = ${E_USER_ORDER_STATUS.active}
        AND o.create_date >= ${start}
        AND o.create_date < ${end}
      GROUP BY o.store_id, i.goods_id, i.goods_version_id, i.goods_name`;

    for (const row of goodsRows) {
      const totalCount = Number(row.total_count) || 0;
      const totalAmount = Number(row.total_amount) || 0;

      const existed = await this.prisma.report_store_daily_goods.findFirst({
        where: {
          store_id: row.store_id,
          goods_id: row.goods_id,
          goods_version_id: row.goods_version_id,
          record_date: recordDate,
        },
      });

      if (existed) {
        await this.prisma.report_store_daily_goods.update({
          where: { id: existed.id },
          data: {
            goods_name: row.goods_name,
            total_count: totalCount,
            total_amount: totalAmount,
            record_date: recordDate,
          },
        });
      } else {
        await this.prisma.report_store_daily_goods.create({
          data: {
            store_id: row.store_id,
            goods_id: row.goods_id,
            goods_version_id: row.goods_version_id,
            goods_name: row.goods_name,
            total_count: totalCount,
            total_amount: totalAmount,
            record_date: recordDate,
          },
        });
      }
    }

    customLogger.log({
      ...logBase,
      message: 'finished store and goods schedule',
      step: '3/4',
      data: { storeCount: storeRows.length, goodsCount: goodsRows.length },
    });

    // 3) 聚合平台维度订单统计
    const platformTotalOrders = storeRows.reduce(
      (sum, row) => sum + Number(row.total_orders || 0),
      0,
    );
    const platformTotalAmount = storeRows.reduce(
      (sum, row) => sum + Number(row.total_amount || 0),
      0,
    );

    const existedPlatform =
      await this.prisma.report_platform_daily_order.findFirst({
        where: { record_date: recordDate },
      });

    if (existedPlatform) {
      await this.prisma.report_platform_daily_order.update({
        where: { id: existedPlatform.id },
        data: {
          total_orders: platformTotalOrders,
          total_amount: platformTotalAmount,
          record_date: recordDate,
        },
      });
    } else {
      await this.prisma.report_platform_daily_order.create({
        data: {
          total_orders: platformTotalOrders,
          total_amount: platformTotalAmount,
          record_date: recordDate,
        },
      });
    }

    customLogger.log({
      ...logBase,
      message: 'finished platform schedule',
      step: '4/4',
      data: { platformTotalOrders, platformTotalAmount },
    });
  }
}
