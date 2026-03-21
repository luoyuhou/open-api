import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Pagination } from '../../common/dto/pagination';
import Utils from '../../common/utils';

@Injectable()
export class StoreResourceService {
  constructor(private readonly prisma: PrismaService) {}

  async pagination(pagination: Pagination) {
    const { pageNum, pageSize, sorted } = pagination;
    const where = Utils.formatWhereByPagination(pagination.filtered);
    const count = await this.prisma.store_resource_order.count({ where });
    const searchPayload = {
      where: where,
      take: pageSize,
      skip: pageNum * pageSize,
    };
    if (sorted.length) {
      searchPayload['orderBy'] = {
        [sorted[0].id]: sorted[0].desc ? 'desc' : 'asc',
      };
    }
    const orders = await this.prisma.store_resource_order.findMany(
      searchPayload,
    );

    // 获取商铺名称
    const storeIds = Array.from(new Set(orders.map((o) => o.store_id)));
    const stores =
      storeIds.length > 0
        ? await this.prisma.store.findMany({
            where: { store_id: { in: storeIds } },
            select: { store_id: true, store_name: true },
          })
        : [];

    const storeMap = new Map(stores.map((s) => [s.store_id, s.store_name]));

    const data = orders.map((order) => ({
      ...order,
      quota_amount: Number(order.quota_amount),
      store_name: storeMap.get(order.store_id) || '',
    }));

    return { data, rows: count, pages: Math.ceil(count / pageSize) };
  }

  async createQuotaOrder(payload: {
    store_id: string;
    quota_amount: number;
    price: number;
  }) {
    return this.prisma.store_resource_order.create({
      data: {
        order_id: `RO${Date.now()}${Math.floor(Math.random() * 1000)}`,
        store_id: payload.store_id,
        quota_amount: BigInt(payload.quota_amount),
        price: payload.price,
        status: 0,
      },
    });
  }

  async approveOrder(id: number) {
    const order = await this.prisma.store_resource_order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('申请记录不存在');
    }

    if (order.status === 1) {
      throw new BadRequestException('该申请已通过，请勿重复操作');
    }

    // 1. 更新申请状态
    await this.prisma.store_resource_order.update({
      where: { id },
      data: { status: 1 },
    });

    // 2. 增加商店配额
    const resource = await this.prisma.store_resource.findUnique({
      where: { store_id: order.store_id },
    });

    if (resource) {
      return this.prisma.store_resource.update({
        where: { store_id: order.store_id },
        data: {
          total_quota: resource.total_quota + order.quota_amount,
        },
      });
    } else {
      return this.prisma.store_resource.create({
        data: {
          store_id: order.store_id,
          total_quota: BigInt(10 * 1024 * 1024) + order.quota_amount, // 初始10MB + 申请额度
          used_quota: BigInt(0),
        },
      });
    }
  }

  async getStoreResource(store_id: string) {
    return this.prisma.store_resource.findUnique({
      where: { store_id },
    });
  }

  async listStoreOrders(store_id: string) {
    return this.prisma.store_resource_order.findMany({
      where: { store_id },
      orderBy: { create_date: 'desc' },
    });
  }
}
