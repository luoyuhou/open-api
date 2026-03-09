import { ForbiddenException, Injectable } from '@nestjs/common';
import { Pagination } from '../../common/dto/pagination';
import { OrderService } from '../../order/order.service';
import { PrismaService } from '../../prisma/prisma.service';
import { E_USER_ORDER_STAGE, E_USER_ORDER_STATUS } from '../../order/const';
import { UserEntity } from '../../users/entities/user.entity';
import { EUSER_AUTH_STATUS } from '../../auth/role-management/const';

@Injectable()
export class StoreOrderService {
  constructor(
    private prisma: PrismaService,
    private orderService: OrderService,
  ) {}

  public async pagination(sessUserId: string, pagination: Pagination) {
    const stores = await this.prisma.store.findMany({
      where: { user_id: sessUserId },
    });

    if (!stores.length) {
      return { rows: 0, pages: 0, data: [] };
    }

    const storeIds = stores.map((s) => s.store_id);
    if (!pagination.filtered) {
      pagination.filtered = [];
    }
    pagination.filtered.push({ id: 'store_id', value: storeIds });
    const { rows, pages, data } = await this.orderService.findAll(pagination);

    const codeIds = [];
    data.forEach((o) => codeIds.push(...[o.province, o.city, o.area]));
    const provinces = await this.prisma.province.findMany({
      where: { code: { in: codeIds } },
    });

    const formatedData = data.map((o) => {
      const store = stores.find((s) => s.store_id === o.store_id);
      const province_name = provinces.find((p) => p.code === o.province)?.name;
      const city_name = provinces.find((p) => p.code === o.city)?.name;
      const area_name = provinces.find(
        (p) => p.code === o.area && p.town === '0',
      )?.name;
      const town_name = provinces.find(
        (p) => p.code === o.area && p.town === o.town,
      )?.name;

      return {
        ...o,
        province: province_name,
        city: city_name,
        town: town_name,
        area: area_name,
        _store: store,
      };
    });

    return { rows, pages, data: formatedData };
  }

  public async orderDetail(orderId: string) {
    return this.orderService.orderDetail(orderId);
  }

  public async getStatistics(sessUserId: string) {
    // 获取当前用户的所有商铺
    const stores = await this.prisma.store.findMany({
      where: { user_id: sessUserId },
    });

    if (!stores.length) {
      return {
        pending: 0,
        stocking: 0,
        shipping: 0,
        finished: 0,
        total: 0,
        totalAmount: 0,
        today: {
          total: 0,
          totalAmount: 0,
        },
        byStore: [],
      };
    }

    const storeIds = stores.map((s) => s.store_id);

    // 查询基础条件：属于该商家的店铺，且订单状态为 active（未删除、未取消）
    const baseWhere = {
      store_id: { in: storeIds },
      status: E_USER_ORDER_STATUS.active,
    };

    // 待处理订单数（stage = create）
    const pending = await this.prisma.user_order.count({
      where: {
        ...baseWhere,
        stage: E_USER_ORDER_STAGE.create,
      },
    });

    // 处理中订单数（stage = stock）
    const stocking = await this.prisma.user_order.count({
      where: {
        ...baseWhere,
        stage: E_USER_ORDER_STAGE.accept,
      },
    });

    const shipping = await this.prisma.user_order.count({
      where: {
        ...baseWhere,
        stage: E_USER_ORDER_STAGE.delivery,
      },
    });

    // 已完成订单数（stage = finished 或 received）
    const finished = await this.prisma.user_order.count({
      where: {
        ...baseWhere,
        stage: {
          in: [E_USER_ORDER_STAGE.received, E_USER_ORDER_STAGE.finished],
        },
      },
    });

    // 总订单数（active 状态）
    const total = await this.prisma.user_order.count({
      where: baseWhere,
    });

    // 总金额统计（active 状态的订单）
    const orders = await this.prisma.user_order.findMany({
      where: baseWhere,
      select: { money: true, store_id: true, create_date: true },
    });

    const totalAmount = orders.reduce((sum, order) => sum + order.money, 0);

    // 今日 00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter((o) => {
      return o.create_date && new Date(o.create_date) >= today;
    });

    const todayTotal = todayOrders.length;
    const todayTotalAmount = todayOrders.reduce((sum, o) => sum + o.money, 0);

    // 按店铺拆分
    const byStoreMap = new Map<
      string,
      { storeId: string; storeName: string; total: number; totalAmount: number }
    >();

    orders.forEach((o) => {
      const store = stores.find((s) => s.store_id === o.store_id);
      const key = o.store_id;
      const existed = byStoreMap.get(key);
      if (!existed) {
        byStoreMap.set(key, {
          storeId: o.store_id,
          storeName: store?.store_name || o.store_id,
          total: 1,
          totalAmount: o.money,
        });
      } else {
        byStoreMap.set(key, {
          ...existed,
          total: existed.total + 1,
          totalAmount: existed.totalAmount + o.money,
        });
      }
    });

    const byStore = Array.from(byStoreMap.values());

    return {
      pending,
      stocking,
      shipping,
      finished,
      total,
      totalAmount,
      today: {
        total: todayTotal,
        totalAmount: todayTotalAmount,
      },
      byStore,
    };
  }

  public async getTrend(sessUserId: string, days: number) {
    const stores = await this.prisma.store.findMany({
      where: { user_id: sessUserId },
    });

    if (!stores.length) {
      return { days, points: [] };
    }

    const storeIds = stores.map((s) => s.store_id);

    const baseWhere = {
      store_id: { in: storeIds },
      status: E_USER_ORDER_STATUS.active,
    };

    const end = new Date();
    end.setHours(0, 0, 0, 0);

    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const orders = await this.prisma.user_order.findMany({
      where: {
        ...baseWhere,
        create_date: {
          gte: start,
          lt: new Date(end.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      select: { create_date: true, money: true },
    });

    const pointsMap = new Map<
      string,
      { date: string; total: number; totalAmount: number }
    >();

    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      pointsMap.set(key, { date: key, total: 0, totalAmount: 0 });
    }

    orders.forEach((o) => {
      if (!o.create_date) return;
      const key = new Date(o.create_date).toISOString().slice(0, 10);
      const existed = pointsMap.get(key);
      if (existed) {
        pointsMap.set(key, {
          ...existed,
          total: existed.total + 1,
          totalAmount: existed.totalAmount + o.money,
        });
      }
    });

    const points = Array.from(pointsMap.values()).sort((a, b) =>
      a.date < b.date ? -1 : 1,
    );

    return { days, points };
  }

  // 管理员视角：按月查看有效订单（已完结且 active）的数量与金额趋势
  // 为避免大表实时扫描，这里仅基于日报汇总表 report_store_daily_order 做统计，
  // 并且使用数据库端按日聚合，减少传输和应用层计算压力
  public async getMonthlyTrendForAllStores(
    sessUserId: string,
    month?: string,
    storeId?: string,
  ) {
    // 校验是否后台管理者
    const userAuth = await this.prisma.user_auth.findFirst({
      where: { user_id: sessUserId, status: EUSER_AUTH_STATUS.active },
    });

    if (!userAuth || !userAuth.is_admin) {
      throw new ForbiddenException('仅后台管理者可查看系统订单趋势');
    }

    // 解析月份：YYYY-MM，默认当前月
    const now = new Date();
    const defaultYear = now.getFullYear();
    const defaultMonth = now.getMonth(); // 0-11

    let year = defaultYear;
    let monthIndex = defaultMonth;

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map((v) => Number(v));
      if (!Number.isNaN(y) && !Number.isNaN(m) && m >= 1 && m <= 12) {
        year = y;
        monthIndex = m - 1;
      }
    }

    const start = new Date(year, monthIndex, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, monthIndex + 1, 1);
    end.setHours(0, 0, 0, 0);

    const monthStr = `${year}-${`${monthIndex + 1}`.padStart(2, '0')}`;

    let grouped;
    if (storeId) {
      // 单店趋势：从 report_store_daily_order 表查询
      grouped = await this.prisma.report_store_daily_order.groupBy({
        by: ['record_date'],
        where: {
          store_id: storeId,
          record_date: {
            gte: start,
            lt: end,
          },
        },
        _sum: {
          total_orders: true,
          total_amount: true,
        },
        orderBy: {
          record_date: 'asc',
        },
      });
    } else {
      // 全平台趋势：从 report_platform_daily_order 表查询
      grouped = await this.prisma.report_platform_daily_order.groupBy({
        by: ['record_date'],
        where: {
          record_date: {
            gte: start,
            lt: end,
          },
        },
        _sum: {
          total_orders: true,
          total_amount: true,
        },
        orderBy: {
          record_date: 'asc',
        },
      });
    }

    const daysMap = new Map<
      string,
      { date: string; totalOrders: number; totalAmount: number }
    >();

    // 初始化当前月的每一天，确保无订单的日期也返回 0
    for (
      let d = new Date(start.getTime());
      d < end;
      d.setDate(d.getDate() + 1)
    ) {
      const key = d.toISOString().slice(0, 10);
      daysMap.set(key, { date: key, totalOrders: 0, totalAmount: 0 });
    }

    let totalOrders = 0;
    let totalAmount = 0;

    grouped.forEach((row) => {
      if (!row.record_date) return;
      const key = new Date(row.record_date).toISOString().slice(0, 10);
      const existed = daysMap.get(key);
      if (existed) {
        const orders = Number(row._sum.total_orders) || 0;
        const amount = Number(row._sum.total_amount) || 0;
        existed.totalOrders += orders;
        existed.totalAmount += amount;
        totalOrders += orders;
        totalAmount += amount;
      }
    });

    const days = Array.from(daysMap.values()).sort((a, b) =>
      a.date < b.date ? -1 : 1,
    );

    return {
      month: monthStr,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      totalOrders,
      totalAmount,
      days,
    };
  }

  public async getDailyReport(sessUserId: string, recordDate?: string) {
    // 获取当前用户的所有商铺
    const stores = await this.prisma.store.findMany({
      where: { user_id: sessUserId },
    });

    if (!stores.length) {
      return {
        date: recordDate || '',
        totalStores: 0,
        totalOrders: 0,
        totalAmount: 0,
        stores: [],
      };
    }

    const storeIds = stores.map((s) => s.store_id);

    // 解析报表日期（默认取昨天）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const defaultStart = new Date(today);
    defaultStart.setDate(defaultStart.getDate() - 1);

    const start = recordDate ? new Date(recordDate) : defaultStart;
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const dateStr = start.toISOString().slice(0, 10);

    // 读取门店维度报表
    const orderRows = await this.prisma.report_store_daily_order.findMany({
      where: {
        store_id: { in: storeIds },
        record_date: {
          gte: start,
          lt: end,
        },
      },
    });

    if (!orderRows.length) {
      return {
        date: dateStr,
        totalStores: 0,
        totalOrders: 0,
        totalAmount: 0,
        stores: [],
      };
    }

    // 读取商品维度报表
    const goodsRows = await this.prisma.report_store_daily_goods.findMany({
      where: {
        store_id: { in: storeIds },
        record_date: {
          gte: start,
          lt: end,
        },
      },
    });

    // 预加载商品版本信息（用于展示版本/规格）
    const versionIds = Array.from(
      new Set(goodsRows.map((g) => g.goods_version_id)),
    );

    const versions = versionIds.length
      ? await this.prisma.store_goods_version.findMany({
          where: { version_id: { in: versionIds } },
          select: {
            version_id: true,
            unit_name: true,
            version_number: true,
            count: true,
          },
        })
      : [];

    const versionMap = new Map(versions.map((v) => [v.version_id, v]));

    const storeMap = new Map(
      stores.map((s) => [s.store_id, s.store_name] as [string, string]),
    );

    const goodsByStore = new Map<
      string,
      {
        goods_id: string;
        goods_version_id: string;
        goods_name: string;
        total_count: number;
        total_amount: number;
        unit_name?: string;
        version_number?: string | null;
        pack_count?: number;
      }[]
    >();

    goodsRows.forEach((g) => {
      const list = goodsByStore.get(g.store_id) || [];
      const version = versionMap.get(g.goods_version_id);
      list.push({
        goods_id: g.goods_id,
        goods_version_id: g.goods_version_id,
        goods_name: g.goods_name,
        total_count: g.total_count,
        total_amount: g.total_amount,
        unit_name: version?.unit_name,
        version_number: version?.version_number ?? null,
        pack_count: version?.count,
      });
      goodsByStore.set(g.store_id, list);
    });

    let totalOrders = 0;
    let totalAmount = 0;

    const storesResult = orderRows.map((row) => {
      const goods = goodsByStore.get(row.store_id) || [];
      totalOrders += row.total_orders;
      totalAmount += row.total_amount;

      return {
        store_id: row.store_id,
        store_name: storeMap.get(row.store_id) || row.store_id,
        total_orders: row.total_orders,
        total_amount: row.total_amount,
        goods,
      };
    });

    return {
      date: dateStr,
      totalStores: storesResult.length,
      totalOrders,
      totalAmount,
      stores: storesResult,
    };
  }

  public async getMetrics(sessUserId: string, days: number) {
    const stores = await this.prisma.store.findMany({
      where: { user_id: sessUserId },
    });

    if (!stores.length) {
      return {
        windowDays: days,
        totalOrders: 0,
        totalAmount: 0,
        avgOrderValue: 0,
        cancelRate: 0,
        repurchaseRate: 0,
      };
    }

    const storeIds = stores.map((s) => s.store_id);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const orders = await this.prisma.user_order.findMany({
      where: {
        store_id: { in: storeIds },
        status: {
          in: [E_USER_ORDER_STATUS.active, E_USER_ORDER_STATUS.cancel],
        },
        create_date: {
          gte: start,
        },
      },
      select: { user_id: true, money: true, status: true },
    });

    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, o) => sum + o.money, 0);
    const avgOrderValue =
      totalOrders > 0 ? Math.round(totalAmount / totalOrders) : 0;

    const cancelCount = orders.filter(
      (o) => o.status === E_USER_ORDER_STATUS.cancel,
    ).length;
    const cancelRate = totalOrders > 0 ? cancelCount / totalOrders : 0;

    const userOrderCountMap = new Map<string, number>();
    orders.forEach((o) => {
      const count = userOrderCountMap.get(o.user_id) ?? 0;
      userOrderCountMap.set(o.user_id, count + 1);
    });

    const totalUsers = userOrderCountMap.size;
    const repurchaseUsers = Array.from(userOrderCountMap.values()).filter(
      (count) => count > 1,
    ).length;
    const repurchaseRate = totalUsers > 0 ? repurchaseUsers / totalUsers : 0;

    return {
      windowDays: days,
      totalOrders,
      totalAmount,
      avgOrderValue,
      cancelRate,
      repurchaseRate,
    };
  }

  public async acceptOrder(user: UserEntity, orderId: string) {
    return this.orderService.accept(user, orderId);
  }

  public async shipOrder(user: UserEntity, orderId: string) {
    return this.orderService.delivery(user, orderId);
  }

  public async confirmPayment(user: UserEntity, orderId: string) {
    return this.orderService.confirmPayment(user, orderId);
  }

  public async getOrderHistory(orderId: string) {
    // 获取订单操作历史记录
    const actions = await this.prisma.user_order_action.findMany({
      where: { order_id: orderId },
      orderBy: { create_date: 'asc' },
    });

    // 获取操作用户信息
    const userIds = [...new Set(actions.map((a) => a.user_id))];
    const users = await this.prisma.user.findMany({
      where: { user_id: { in: userIds } },
    });

    // 获取订单基本信息
    const order = await this.prisma.user_order.findUnique({
      where: { order_id: orderId },
    });

    // 组合数据
    const history = actions.map((action) => {
      const user = users.find((u) => u.user_id === action.user_id);
      return {
        ...action,
        user: user
          ? {
              user_id: user.user_id,
              first_name: user.first_name,
              last_name: user.last_name,
              // username: user.username,
            }
          : null,
      };
    });

    return {
      order,
      history,
    };
  }
}
