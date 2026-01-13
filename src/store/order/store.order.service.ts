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
      return {};
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
      select: { money: true },
    });

    const totalAmount = orders.reduce((sum, order) => sum + order.money, 0);

    return {
      pending,
      stocking,
      shipping,
      finished,
      total,
      totalAmount,
    };
  }

  public async acceptOrder(user: UserEntity, orderId: string) {
    return this.orderService.accept(user, orderId);
  }

  public async shipOrder(user: UserEntity, orderId: string) {
    return this.orderService.delivery(user, orderId);
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
