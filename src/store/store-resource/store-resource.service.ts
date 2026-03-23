import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache-manager/cache.service';
import { Pagination } from '../../common/dto/pagination';
import Utils from '../../common/utils';
import { v4 } from 'uuid';
import { STORE_RESOURCE_TYPES } from '../const';

@Injectable()
export class StoreResourceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

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
        order_id: `RO-${v4()}`,
        store_id: payload.store_id,
        quota_amount: BigInt(payload.quota_amount),
        price: payload.price,
        status: 0,
        type: STORE_RESOURCE_TYPES.pay,
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

  /**
   * 获取商店的已使用配额
   * - 如果 Redis 缓存存在，直接返回缓存值
   * - 如果 Redis 缓存不存在，从数据库计算后存入缓存
   * @param store_id 商店 ID
   * @returns 已使用配额（字节）
   */
  async getUsedQuota(store_id: string): Promise<number> {
    // 1. 尝试从 Redis 获取
    const cachedQuota = await this.cacheService.getUsedQuota(store_id);
    if (cachedQuota !== null) {
      return cachedQuota;
    }

    // 2. 从数据库计算
    const usedQuota = await this.calculateUsedQuota(store_id);

    // 3. 存入 Redis 缓存
    await this.cacheService.setUsedQuota(store_id, usedQuota);

    return usedQuota;
  }

  /**
   * 从数据库计算商店的已使用配额
   * @param store_id 商店 ID
   * @returns 已使用配额（字节）
   */
  private async calculateUsedQuota(store_id: string): Promise<number> {
    // 1. 查询该商店所有商品的 goods_id
    const goods = await this.prisma.store_goods.findMany({
      where: { store_id },
      select: { goods_id: true },
    });
    const goodsIds = goods.map((g) => g.goods_id);

    if (goodsIds.length === 0) {
      return 0;
    }

    // 2. 查询所有商品版本的 image_hash
    const versions = await this.prisma.store_goods_version.findMany({
      where: { goods_id: { in: goodsIds } },
      select: { image_hash: true },
    });

    const hashes = Array.from(
      new Set(versions.map((v) => v.image_hash).filter(Boolean)),
    );

    if (hashes.length === 0) {
      return 0;
    }

    // 3. 根据 hash 获取文件大小
    const files = await this.prisma.file.findMany({
      where: { hash: { in: hashes as string[] } },
      select: { size: true },
    });

    // 4. 累加计算已使用大小
    const usedSize = files.reduce(
      (acc, f) => acc + BigInt(f.size || 0),
      BigInt(0),
    );

    return Number(usedSize);
  }

  /**
   * 使商店的已使用配额缓存失效
   * @param store_id 商店 ID
   */
  async invalidateUsedQuota(store_id: string): Promise<void> {
    await this.cacheService.invalidateUsedQuota(store_id);
  }
}
