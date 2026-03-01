import { Injectable } from '@nestjs/common';
import { Pagination } from '../../common/dto/pagination';
import { OrderService } from '../../order/order.service';
import { PrismaService } from '../../prisma/prisma.service';
import { E_USER_ORDER_STAGE, E_USER_ORDER_STATUS } from '../../order/const';
import { UserEntity } from '../../users/entities/user.entity';

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
