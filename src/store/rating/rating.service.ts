import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UserEntity } from '../../users/entities/user.entity';
import { Pagination } from '../../common/dto/pagination';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RatingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 提交商品评价
   */
  async createRating(dto: CreateRatingDto, user: UserEntity) {
    // 检查订单是否存在且属于该用户
    const order = await this.prisma.user_order.findUnique({
      where: { order_id: dto.orderId },
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.user_id !== user.user_id) {
      throw new Error('无权评价该订单');
    }

    // 检查是否已评价
    const existing = await this.prisma.goods_rating.findFirst({
      where: { order_id: dto.orderId, goods_id: dto.goodsId },
    });

    if (existing) {
      throw new Error('该商品已评价');
    }

    // 获取商品信息
    const goods = await this.prisma.store_goods.findUnique({
      where: { goods_id: dto.goodsId },
    });

    // 创建评价
    const rating = await this.prisma.goods_rating.create({
      data: {
        rating_id: uuidv4(),
        order_id: dto.orderId,
        goods_id: dto.goodsId,
        goods_name: goods?.name || '',
        user_id: user.user_id,
        store_id: order.store_id,
        star: dto.star,
        content: dto.content,
        images: dto.images ? JSON.stringify(dto.images) : null,
        status: 1,
      },
    });

    // 更新店铺评分统计
    await this.updateStoreRatingStats(order.store_id);

    return rating;
  }

  /**
   * 获取商品评价列表
   */
  async getGoodsRatings(goodsId: string, pagination: Pagination) {
    const page = pagination.pageNum || 0;
    const size = pagination.pageSize || 10;

    const [list, total] = await Promise.all([
      this.prisma.goods_rating.findMany({
        where: { goods_id: goodsId, status: 1 },
        skip: page * size,
        take: size,
        orderBy: { create_date: 'desc' },
      }),
      this.prisma.goods_rating.count({
        where: { goods_id: goodsId, status: 1 },
      }),
    ]);

    // 计算平均分
    const avgResult = await this.prisma.goods_rating.aggregate({
      where: { goods_id: goodsId, status: 1 },
      _avg: { star: true },
    });

    return {
      list,
      total,
      avgStar: avgResult._avg.star || 0,
      page,
      size,
    };
  }

  /**
   * 获取店铺评价列表
   */
  async getStoreRatings(storeId: string, pagination: Pagination) {
    const page = pagination.pageNum || 0;
    const size = pagination.pageSize || 10;

    const [list, total] = await Promise.all([
      this.prisma.goods_rating.findMany({
        where: { store_id: storeId },
        skip: page * size,
        take: size,
        orderBy: { create_date: 'desc' },
      }),
      this.prisma.goods_rating.count({
        where: { store_id: storeId },
      }),
    ]);

    return { list, total, page, size };
  }

  /**
   * 获取订单评价
   */
  async getOrderRating(orderId: string) {
    return this.prisma.goods_rating.findMany({
      where: { order_id: orderId },
    });
  }

  /**
   * 隐藏评价
   */
  async hideRating(ratingId: string, user: UserEntity) {
    await this.prisma.goods_rating.update({
      where: { rating_id: ratingId },
      data: { status: 2 },
    });
  }

  /**
   * 显示评价
   */
  async showRating(ratingId: string, user: UserEntity) {
    await this.prisma.goods_rating.update({
      where: { rating_id: ratingId },
      data: { status: 1 },
    });
  }

  /**
   * 更新店铺评分统计
   */
  async updateStoreRatingStats(storeId: string) {
    const result = await this.prisma.goods_rating.aggregate({
      where: { store_id: storeId, status: 1 },
      _count: { rating_id: true },
      _avg: { star: true },
    });

    const count = result._count.rating_id;
    const avgStar = result._avg.star || 0;

    // 使用 upsert 创建或更新
    await this.prisma.store_rating.upsert({
      where: { store_id: storeId },
      update: {
        order_count: count,
        avg_star: avgStar,
        rating: avgStar,
        updated_at: new Date(),
      },
      create: {
        store_id: storeId,
        order_count: count,
        avg_star: avgStar,
        rating: avgStar,
      },
    });
  }

  /**
   * 获取店铺评分统计
   */
  async getStoreRatingStats(storeId: string) {
    const stats = await this.prisma.store_rating.findUnique({
      where: { store_id: storeId },
    });

    if (!stats) {
      return {
        store_id: storeId,
        order_count: 0,
        avg_star: 0,
        rating: 0,
      };
    }

    return stats;
  }

  /**
   * 获取店铺评分排名列表
   */
  async getStoreRanking(pagination: Pagination) {
    const page = pagination.pageNum || 0;
    const size = pagination.pageSize || 10;

    // 获取所有店铺评分，按评分降序排列
    const ratings = await this.prisma.store_rating.findMany({
      skip: page * size,
      take: size,
      orderBy: [{ rating: 'desc' }, { order_count: 'desc' }],
    });

    const total = await this.prisma.store_rating.count();

    // 获取店铺名称
    const storeIds = ratings.map((r) => r.store_id);
    const stores = await this.prisma.store.findMany({
      where: { store_id: { in: storeIds } },
      select: { store_id: true, store_name: true, status: true },
    });

    const storeMap = new Map(stores.map((s) => [s.store_id, s]));

    // 组合数据并添加排名
    const list = ratings.map((r, index) => {
      const store = storeMap.get(r.store_id);
      return {
        rank: page * size + index + 1,
        store_id: r.store_id,
        store_name: store?.store_name || '未知店铺',
        store_status: store?.status || 0,
        rating: r.rating,
        avg_star: r.avg_star,
        order_count: r.order_count,
        updated_at: r.updated_at,
      };
    });

    return { list, total, page, size };
  }
}
