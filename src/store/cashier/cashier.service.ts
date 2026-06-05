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
      // include: {
      //   // 实际上模型里没有直接定义 relation，我们需要手动查询或假设结构
      // },
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
        categoryIds: [p.category_id],
        price: p.price / 100, // 后端分转前端元
        billingMode: p.billingMode,
        status: 'on',
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
            const member = await tx.store_member.findUnique({
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

              await tx.store_member.update({
                where: { member_id: orderDto.member_id },
                data: {
                  balance: { decrement: balanceDeduction },
                  points: { increment: pointsAddition - pointsDeduction },
                },
              });
            }
          }

          const newOrder = await tx.user_order.create({
            data: {
              order_id: orderId,
              store_id: dto.store_id,
              user_id: orderDto.member_id || 'CASHIER_GUEST',
              status: 1, // 已完成
              stage: 3, // 已结算
              payment_method: orderDto.payment_method || 'CASHIER_OFFLINE',
              money: orderDto.payable_amount || orderDto.total_amount,
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

  async getTodayOrders(storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
    const members = await this.prisma.store_member.findMany({
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

      return {
        id: o.order_id,
        memberId: o.user_id,
        memberName: member ? member.name : '散客',
        memberPhone: member ? member.phone : '',
        totalAmount: (o.money / 100).toFixed(2),
        payableAmount: (o.money / 100).toFixed(2),
        createdAt: o.create_date,
        status: 'completed',
        paymentMethod: o.payment_method,
        items: items,
      };
    });
  }
}
