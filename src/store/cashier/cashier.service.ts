import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CashierSyncPushDto } from './dto/cashier-sync.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CashierService {
  constructor(private prisma: PrismaService) {}

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

  async pushOrders(dto: CashierSyncPushDto) {
    const results = [];
    for (const orderDto of dto.orders) {
      try {
        // 开启事务处理单个订单
        const order = await this.prisma.$transaction(async (tx) => {
          const orderId = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;

          const newOrder = await tx.user_order.create({
            data: {
              order_id: orderId,
              store_id: dto.store_id,
              user_id: orderDto.member_id || 'CASHIER_GUEST',
              status: 1, // 已完成
              stage: 3, // 已结算
              payment_method: 'CASHIER_OFFLINE',
              money: orderDto.total_amount,
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

          for (const item of orderDto.items) {
            await tx.user_order_info.create({
              data: {
                order_info_id: uuidv4(),
                order_id: orderId,
                goods_id: item.goods_id,
                goods_name: '', // 可以在此处查询补充
                goods_version_id: item.version_id,
                count: item.count,
                price: item.price,
              },
            });
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
    }
    return results;
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
      // include: {
      //   // 由于没有显式模型关联，稍后在 Controller 中手动补充详情或根据需要调整模型
      // },
      orderBy: {
        create_date: 'desc',
      },
    });

    return orders.map((o) => ({
      id: o.order_id,
      totalAmount: (o.money / 100).toFixed(2),
      createdAt: o.create_date,
      status: 'completed',
      items: [], // 实际应用中建议通过 info 表关联获取
    }));
  }
}
