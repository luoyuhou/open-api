import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CashierOrderDto } from './dto/cashier-order.dto';
import { v4 as uuidv4 } from 'uuid';
import customLogger from '../../common/logger';

@Injectable()
export class CashierService {
  constructor(private prisma: PrismaService) {}

  // 使用 Promise 链实现简单的互斥锁，防止 SQLite 在非 WAL 模式下的写入冲突
  private lockPromise: Promise<any> = Promise.resolve();

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.lockPromise.then(fn);
    this.lockPromise = next.catch((err) => {
      customLogger.error({ message: 'with lock', error: err.message });
    });
    return next;
  }

  async getSyncData(storeId: string) {
    const categories = await this.prisma.category_goods.findMany({
      where: { store_id: storeId, status: 1 },
      orderBy: { rank: 'asc' },
    });

    const goods = await this.prisma.store_goods.findMany({
      where: { store_id: storeId, status: 1 },
      orderBy: { rank: 'asc' },
    });

    // 由于 prisma schema 中没有定义显示关联，我们通过 goods_id 手动聚合
    const goodsIds = goods.map((g) => g.goods_id);
    const versions = await this.prisma.store_goods_version.findMany({
      where: {
        goods_id: { in: goodsIds },
        status: 1,
      },
    });

    // 组合数据
    const products = goods.map((g) => {
      const gVersions = versions.filter((v) => v.goods_id === g.goods_id);
      return {
        ...g,
        versions: gVersions,
        // 为了兼容小程序本地 db.js 的格式
        price: gVersions[0]?.price || 0,
        billingMode:
          gVersions[0]?.unit_name === 'g' || gVersions[0]?.unit_name === '斤'
            ? 'weight'
            : 'count',
      };
    });

    return {
      categories: categories.map((c) => ({ id: c.category_id, name: c.name })),
      products: products.map((p) => ({
        id: p.goods_id,
        name: p.name,
        categoryIds: (p.category_id || '').split(',').filter(Boolean),
        price: p.price / 100, // 后端分转前端元
        billingMode: p.billingMode,
        status: 'on',
        rank: p.rank ?? 0,
        versions: p.versions.map((v) => ({
          id: v.version_id,
          name: v.version_number || v.unit_name,
          price: v.price / 100,
          barCode: v.bar_code,
        })),
      })),
    };
  }

  async pushOrder(dto: CashierOrderDto) {
    return await this.withLock(async () => {
      const results = [];
      const orderDto = dto.order;
      try {
        // 开启事务处理单个订单
        const order = await this.prisma.$transaction(async (tx) => {
          // 强制在事务开始时获取写入锁，防止后续升级锁时发生死锁
          await tx.$executeRawUnsafe(
            'UPDATE user SET update_date = update_date WHERE id = -1',
          );

          const orderId = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;

          // 如果是会员，处理余额扣除和积分更新
          if (orderDto.member_id && orderDto.member_id !== 'CASHIER_GUEST') {
            const member = await (tx as any).store_member.findUnique({
              where: { member_id: orderDto.member_id },
            });

            if (member) {
              const balanceDeduction =
                orderDto.payment_method === 'balance'
                  ? orderDto.payable_amount || orderDto.total_amount
                  : 0;
              const pointsDeduction = orderDto.points_used || 0;
              const pointsAddition = orderDto.earn_points || 0;

              if (balanceDeduction > 0 && member.balance < balanceDeduction) {
                throw new Error(`会员余额不足`);
              }

              await (tx as any).store_member.update({
                where: { member_id: orderDto.member_id },
                data: {
                  balance: { decrement: balanceDeduction },
                  points: { increment: pointsAddition - pointsDeduction },
                },
              });
            }
          }

          // 计算抵扣金额
          const totalAmount = orderDto.total_amount || 0;
          const payableAmount = orderDto.payable_amount || totalAmount;
          const discountAmount = totalAmount - payableAmount;
          const discountRate = orderDto.discount_rate ?? 100;

          const newOrder = await tx.user_order.create({
            data: {
              order_id: orderId,
              store_id: dto.store_id,
              user_id: orderDto.member_id || 'CASHIER_GUEST',
              status: 1, // 已完成
              stage: 3, // 已结算
              payment_method: orderDto.payment_method || 'CASHIER_OFFLINE',
              money: payableAmount,
              original_amount: totalAmount,
              discount_rate: discountRate,
              discount_amount: discountAmount > 0 ? discountAmount : 0,
              points_used: orderDto.points_used || 0,
              points_earn: orderDto.earn_points || 0,
              recipient: 'CASHIER',
              phone: '',
              province: '',
              city: '',
              area: '',
              town: '',
              address: '线下收银',
              delivery_date: new Date(orderDto.created_at),
              create_date: new Date(orderDto.created_at),
            },
          });

          if (orderDto.items && orderDto.items.length > 0) {
            for (const item of orderDto.items) {
              await tx.user_order_info.create({
                data: {
                  order_info_id: uuidv4(),
                  order_id: orderId,
                  goods_id: item.goods_id,
                  goods_name: item.name,
                  goods_version_id: item.version_id,
                  count: item.count,
                  price: item.price,
                },
              });
            }
          }
          return newOrder;
        });
        results.push({
          local_id: orderDto.local_id,
          remote_id: order.order_id,
          status: 'success',
        });
      } catch (error) {
        results.push({
          local_id: orderDto.local_id,
          status: 'error',
          message: error.message,
        });
      }

      return results;
    });
  }

  async getTodayOrderCount(storeId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await this.prisma.user_order.count({
      where: {
        store_id: storeId,
        create_date: {
          gte: today,
        },
        status: 1, // 已完成
      },
    });

    return count;
  }

  async getTodayOrders(storeId: string, page = 1, pageSize = 5) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const skip = (page - 1) * pageSize;

    const orders = await this.prisma.user_order.findMany({
      where: {
        store_id: storeId,
        create_date: {
          gte: today,
        },
        status: 1, // 已完成
      },
      orderBy: {
        create_date: 'desc',
      },
      skip,
      take: pageSize,
    });

    const orderIds = orders.map((o) => o.order_id);
    const orderInfos = await this.prisma.user_order_info.findMany({
      where: {
        order_id: { in: orderIds },
      },
    });

    const memberIds = orders
      .map((o) => o.user_id)
      .filter((id) => id && id !== 'CASHIER_GUEST');
    const members = await (this.prisma as any).store_member.findMany({
      where: {
        member_id: { in: memberIds },
      },
    });

    const versionIds = orderInfos.map((i) => i.goods_version_id);
    const versions = await this.prisma.store_goods_version.findMany({
      where: { version_id: { in: versionIds } },
    });

    return orders.map((o) => {
      const items = orderInfos
        .filter((info) => info.order_id === o.order_id)
        .map((item) => {
          const v = versions.find(
            (v) => v.version_id === item.goods_version_id,
          );
          const billingMode =
            v?.unit_name === 'g' || v?.unit_name === '斤' ? 'weight' : 'count';
          return {
            id: item.goods_id,
            versionId: item.goods_version_id,
            name: item.goods_name,
            quantity: item.count,
            price: (item.price / 100).toFixed(2),
            billingMode: billingMode,
          };
        });

      const member = members.find((m) => m.member_id === o.user_id);

      // 计算各金额（分转元）
      const originalAmount = (o.original_amount || o.money) / 100;
      const totalDiscountAmount = (o.discount_amount || 0) / 100;
      const payableAmount = o.money / 100;
      const discountRate = o.discount_rate ?? 100;
      const manualDiscountAmount =
        discountRate < 100 ? (originalAmount * (100 - discountRate)) / 100 : 0;
      const pointsDiscountAmount = Math.max(
        0,
        totalDiscountAmount - manualDiscountAmount,
      );

      return {
        id: o.order_id,
        memberId: o.user_id,
        memberName: member ? member.name : '散客',
        memberPhone: member ? member.phone : '',
        totalAmount: originalAmount.toFixed(2),
        payableAmount: payableAmount.toFixed(2),
        discountAmount: totalDiscountAmount.toFixed(2),
        manualDiscountAmount: manualDiscountAmount.toFixed(2),
        pointsDiscountAmount: pointsDiscountAmount.toFixed(2),
        discountRate:
          discountRate < 100 ? (discountRate / 10).toFixed(1) : null,
        pointsUsed: o.points_used || 0,
        earnPoints: o.points_earn || 0,
        createdAt: o.create_date,
        status: 'completed',
        paymentMethod: o.payment_method,
        items: items,
      };
    });
  }
}
