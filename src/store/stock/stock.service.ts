import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateStockDto } from './dto/update-stock.dto';
import { UserEntity } from 'src/users/entities/user.entity';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取库存预警列表
   */
  async getStockWarningList(storeId: string) {
    // 获取店铺下所有商品及其版本
    const goods = await this.prisma.store_goods.findMany({
      where: { store_id: storeId },
      select: { goods_id: true, name: true },
    });

    const goodsIds = goods.map((g) => g.goods_id);

    // 查询库存低于预警阈值的版本
    const versions = await this.prisma.store_goods_version.findMany({
      where: {
        goods_id: { in: goodsIds },
        status: 1, // 只查正常状态
      },
    });

    // 筛选出库存低于预警阈值的
    return versions
      .filter((v) => v.count <= v.stock_warning)
      .map((v) => {
        const goodsInfo = goods.find((g) => g.goods_id === v.goods_id);
        return {
          version_id: v.version_id,
          goods_id: v.goods_id,
          goods_name: goodsInfo?.name || '',
          version_number: v.version_number,
          unit_name: v.unit_name,
          count: v.count,
          stock_warning: v.stock_warning,
          price: v.price,
          warning_level:
            v.count === 0
              ? 'critical'
              : v.count <= v.stock_warning / 2
              ? 'high'
              : 'low',
        };
      });
  }

  /**
   * 更新库存
   */
  async updateStock(dto: UpdateStockDto, user: UserEntity) {
    const { versionId, count, operateType } = dto;

    const version = await this.prisma.store_goods_version.findUnique({
      where: { version_id: versionId },
    });

    if (!version) {
      throw new Error('商品版本不存在');
    }

    let newCount = version.count;
    if (operateType === 'add') {
      newCount += count;
    } else if (operateType === 'subtract') {
      newCount = Math.max(0, newCount - count);
    } else {
      newCount = count; // set
    }

    await this.prisma.store_goods_version.update({
      where: { version_id: versionId },
      data: {
        count: newCount,
        update_date: new Date(),
      },
    });

    return { oldCount: version.count, newCount };
  }

  /**
   * 更新库存预警阈值
   */
  async updateWarningThreshold(
    versionId: string,
    threshold: number,
    user: UserEntity,
  ) {
    await this.prisma.store_goods_version.update({
      where: { version_id: versionId },
      data: {
        stock_warning: threshold,
        update_date: new Date(),
      },
    });
  }
}
