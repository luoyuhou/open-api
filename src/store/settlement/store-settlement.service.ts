import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { E_USER_ORDER_STAGE, E_USER_ORDER_STATUS } from '../../order/const';

@Injectable()
export class StoreSettlementService {
  constructor(private prisma: PrismaService) {}

  /**
   * 生成商家月度结算
   * @param storeId 店铺ID，不传则生成所有店铺
   * @param month 月份 YYYY-MM，不传则上个月
   */
  async generateMonthlySettlement(storeId?: string, month?: string) {
    // 计算月份
    const now = new Date();
    const targetMonth = month || this.getLastMonth(now);
    const { startDate, endDate } = this.getMonthRange(targetMonth);

    // 查询需要结算的店铺
    const stores = storeId
      ? [{ store_id: storeId }]
      : await this.prisma.user_order.findMany({
          where: {
            create_date: { gte: startDate, lt: endDate },
            status: E_USER_ORDER_STATUS.active,
          },
          select: { store_id: true },
          distinct: ['store_id'],
        });

    const results = [];

    for (const { store_id } of stores) {
      // 检查是否已存在结算记录
      const existing = await this.prisma.store_settlement.findUnique({
        where: { store_id_month: { store_id, month: targetMonth } },
      });

      if (existing) {
        results.push({ store_id, settlement: existing, skipped: true });
        continue;
      }

      // 查询已完成且已支付的订单
      const orders = await this.prisma.user_order.findMany({
        where: {
          store_id,
          create_date: { gte: startDate, lt: endDate },
          status: E_USER_ORDER_STATUS.active,
          stage: {
            in: [E_USER_ORDER_STAGE.received, E_USER_ORDER_STAGE.finished],
          },
          pay_status: 1, // 已支付
        },
      });

      const totalOrders = orders.length;
      const totalAmount = orders.reduce((sum, o) => sum + o.money, 0);
      // 商家收入 = 订单金额（用户直接支付给商家，平台不介入）
      const totalIncome = totalAmount;

      // 创建结算记录
      const settlement = await this.prisma.store_settlement.create({
        data: {
          store_id,
          month: targetMonth,
          total_orders: totalOrders,
          total_amount: totalAmount,
          total_income: totalIncome,
          start_date: startDate,
          end_date: endDate,
          status: 0,
          details: {
            create: orders.map((o) => ({
              order_id: o.order_id,
              amount: o.money,
              order_stage: o.stage,
              pay_status: o.pay_status,
            })),
          },
        },
      });

      results.push({ store_id, settlement, skipped: false });
    }

    return results;
  }

  /**
   * 获取商家结算列表
   */
  async listSettlements(params: {
    storeId?: string;
    month?: string;
    status?: number;
    page?: number;
    pageSize?: number;
  }) {
    const { storeId, month, status, page = 1, pageSize = 20 } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (storeId) where.store_id = storeId;
    if (month) where.month = month;
    if (status !== undefined) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.store_settlement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { create_date: 'desc' },
      }),
      this.prisma.store_settlement.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  /**
   * 获取结算详情
   */
  async getSettlementDetail(settlementId: string) {
    const settlement = await this.prisma.store_settlement.findUnique({
      where: { settlement_id: settlementId },
      include: {
        details: true,
      },
    });

    if (!settlement) {
      throw new Error('结算记录不存在');
    }

    // 获取店铺信息
    const store = await this.prisma.store.findUnique({
      where: { store_id: settlement.store_id },
    });

    return { ...settlement, details: settlement.details, store };
  }

  /**
   * 确认结算
   */
  async confirmSettlement(settlementId: string) {
    return this.prisma.store_settlement.update({
      where: { settlement_id: settlementId },
      data: { status: 1 },
    });
  }

  /**
   * 完成结算（已打款）
   */
  async settleSettlement(settlementId: string) {
    return this.prisma.store_settlement.update({
      where: { settlement_id: settlementId },
      data: {
        status: 2,
        settled_at: new Date(),
      },
    });
  }

  /**
   * 获取商家结算统计
   */
  async getStoreSettlementStats(storeId: string) {
    const settlements = await this.prisma.store_settlement.findMany({
      where: { store_id: storeId },
      orderBy: { month: 'desc' },
      take: 12,
    });

    const totalIncome = settlements.reduce((sum, s) => sum + s.total_income, 0);
    const totalOrders = settlements.reduce((sum, s) => sum + s.total_orders, 0);
    const pendingSettlements = settlements.filter((s) => s.status === 0).length;

    return {
      totalIncome,
      totalOrders,
      pendingSettlements,
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
