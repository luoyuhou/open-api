import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// 平台结算明细类型
export enum E_PLATFORM_SETTLEMENT_TYPE {
  subscription = 1, // 订阅费用
  resource = 2, // 资源购买
  order_service = 3, // 订单服务费
}

// 免费额度：每天10单
const FREE_ORDER_QUOTA_PER_DAY = 10;
// 服务费：每天超出部分0.1元（10分）
const SERVICE_FEE_PER_DAY = 10;

@Injectable()
export class PlatformSettlementService {
  constructor(private prisma: PrismaService) {}

  /**
   * 生成平台月度结算
   * @param month 月份 YYYY-MM，不传则上个月
   */
  async generateMonthlySettlement(month?: string) {
    const now = new Date();
    const targetMonth = month || this.getLastMonth(now);
    const { startDate, endDate } = this.getMonthRange(targetMonth);

    // 检查是否已存在结算记录
    const existing = await this.prisma.platform_settlement.findUnique({
      where: { month: targetMonth },
    });

    if (existing) {
      return { settlement: existing, skipped: true };
    }

    const details: any[] = [];

    // 1. 收集订阅费用
    const subscriptionPayments =
      await this.prisma.store_service_payment.findMany({
        where: {
          paid_at: { gte: startDate, lt: endDate },
        },
        include: {
          invoice: {
            include: {
              subscription: true,
            },
          },
        },
      });

    let totalSubscriptionFee = 0;
    for (const payment of subscriptionPayments) {
      const storeId = payment.invoice.subscription.store_id;
      totalSubscriptionFee += payment.amount;
      details.push({
        type: E_PLATFORM_SETTLEMENT_TYPE.subscription,
        ref_id: payment.id.toString(),
        store_id: storeId,
        amount: payment.amount,
        remark: `订阅支付 #${payment.invoice_id}`,
      });
    }

    // 2. 收集资源购买费用
    const resourceOrders = await this.prisma.store_resource_order.findMany({
      where: {
        create_date: { gte: startDate, lt: endDate },
        type: 2, // 付费购买
        status: 1, // 已通过
      },
    });

    let totalResourceFee = 0;
    for (const order of resourceOrders) {
      totalResourceFee += order.price;
      details.push({
        type: E_PLATFORM_SETTLEMENT_TYPE.resource,
        ref_id: order.order_id,
        store_id: order.store_id,
        amount: order.price,
        remark: `资源购买 #${order.order_id}`,
      });
    }

    // 3. 计算订单服务费
    const orderServiceFeeDetails = await this.calculateOrderServiceFee(
      startDate,
      endDate,
      targetMonth,
    );
    const totalOrderServiceFee = orderServiceFeeDetails.reduce(
      (sum, d) => sum + d.amount,
      0,
    );
    details.push(...orderServiceFeeDetails);

    // 创建平台结算记录
    const settlement = await this.prisma.platform_settlement.create({
      data: {
        month: targetMonth,
        total_subscription_fee: totalSubscriptionFee,
        total_resource_fee: totalResourceFee,
        total_order_service_fee: totalOrderServiceFee,
        total_amount:
          totalSubscriptionFee + totalResourceFee + totalOrderServiceFee,
        start_date: startDate,
        end_date: endDate,
        status: 0,
        details: {
          create: details,
        },
      },
    });

    return { settlement, details, skipped: false };
  }

  /**
   * 计算订单服务费
   * 逻辑：每天10单免费，超出部分每天收0.1元
   */
  private async calculateOrderServiceFee(
    startDate: Date,
    endDate: Date,
    month: string,
  ) {
    const details: any[] = [];

    // 按天统计每个店铺的订单数
    const dailyOrders = await this.prisma.$queryRaw<any[]>`
      SELECT 
        store_id,
        date(create_date) as order_date,
        COUNT(*) as order_count
      FROM user_order
      WHERE create_date >= ${startDate}
        AND create_date < ${endDate}
        AND status = 0
      GROUP BY store_id, date(create_date)
    `;

    // 计算每个店铺每天的服务费
    for (const row of dailyOrders) {
      const { store_id, order_date, order_count } = row;
      const orderDate = new Date(order_date);
      const ordersOverQuota = Math.max(
        0,
        Number(order_count) - FREE_ORDER_QUOTA_PER_DAY,
      );

      if (ordersOverQuota > 0) {
        // 有超出免费额度的订单，计算服务费
        // 费用 = 超出天数 * 0.1元 = 超出天数 * 10分
        const feeAmount = SERVICE_FEE_PER_DAY;

        // 检查是否已记录
        const existingFee = await this.prisma.store_order_service_fee.findFirst(
          {
            where: {
              store_id,
              fee_date: orderDate,
            },
          },
        );

        if (!existingFee) {
          // 创建服务费记录
          await this.prisma.store_order_service_fee.create({
            data: {
              store_id,
              order_id: `daily_${store_id}_${order_date}`,
              fee_date: orderDate,
              fee_amount: feeAmount,
              month,
              is_charged: true,
            },
          });

          details.push({
            type: E_PLATFORM_SETTLEMENT_TYPE.order_service,
            ref_id: `daily_${store_id}_${order_date}`,
            store_id,
            amount: feeAmount,
            remark: `订单服务费 ${order_date} (超出${ordersOverQuota}单)`,
          });
        }
      }
    }

    return details;
  }

  /**
   * 获取平台结算列表
   */
  async listSettlements(params: {
    month?: string;
    status?: number;
    page?: number;
    pageSize?: number;
  }) {
    const { month, status, page = 1, pageSize = 20 } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (month) where.month = month;
    if (status !== undefined) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.platform_settlement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { create_date: 'desc' },
      }),
      this.prisma.platform_settlement.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  /**
   * 获取结算详情
   */
  async getSettlementDetail(settlementId: string) {
    const settlement = await this.prisma.platform_settlement.findUnique({
      where: { settlement_id: settlementId },
      include: {
        details: true,
      },
    });

    if (!settlement) {
      throw new Error('结算记录不存在');
    }

    // 按类型汇总
    const summary = {
      subscription: settlement.details.filter(
        (d) => d.type === E_PLATFORM_SETTLEMENT_TYPE.subscription,
      ),
      resource: settlement.details.filter(
        (d) => d.type === E_PLATFORM_SETTLEMENT_TYPE.resource,
      ),
      orderService: settlement.details.filter(
        (d) => d.type === E_PLATFORM_SETTLEMENT_TYPE.order_service,
      ),
    };

    return { ...settlement, details: settlement.details, summary };
  }

  /**
   * 确认结算
   */
  async confirmSettlement(settlementId: string) {
    return this.prisma.platform_settlement.update({
      where: { settlement_id: settlementId },
      data: { status: 1 },
    });
  }

  /**
   * 完成结算
   */
  async settleSettlement(settlementId: string) {
    return this.prisma.platform_settlement.update({
      where: { settlement_id: settlementId },
      data: {
        status: 2,
        settled_at: new Date(),
      },
    });
  }

  /**
   * 获取平台结算统计
   */
  async getPlatformSettlementStats() {
    const settlements = await this.prisma.platform_settlement.findMany({
      orderBy: { month: 'desc' },
      take: 12,
    });

    const totalAmount = settlements.reduce((sum, s) => sum + s.total_amount, 0);
    const totalSubscriptionFee = settlements.reduce(
      (sum, s) => sum + s.total_subscription_fee,
      0,
    );
    const totalResourceFee = settlements.reduce(
      (sum, s) => sum + s.total_resource_fee,
      0,
    );
    const totalOrderServiceFee = settlements.reduce(
      (sum, s) => sum + s.total_order_service_fee,
      0,
    );

    return {
      totalAmount,
      totalSubscriptionFee,
      totalResourceFee,
      totalOrderServiceFee,
      recentSettlements: settlements,
    };
  }

  /**
   * 获取上个月的月份字符串
   */
  private getLastMonth(date: Date): string {
    const d = new Date(date);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * 获取月份的开始和结束日期
   */
  private getMonthRange(month: string): { startDate: Date; endDate: Date } {
    const [year, m] = month.split('-').map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 1);
    return { startDate, endDate };
  }
}
