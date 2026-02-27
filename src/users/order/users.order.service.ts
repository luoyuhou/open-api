import { Injectable } from '@nestjs/common';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateOrderDto } from '../../order/dto/create-order.dto';
import { UserEntity } from '../entities/user.entity';
import { OrderService } from '../../order/order.service';
import { Pagination } from '../../common/dto/pagination';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersOrderService {
  constructor(
    private prisma: PrismaService,
    private orderService: OrderService,
  ) {}

  create(user: UserEntity, createOrderDto: CreateOrderDto) {
    return this.orderService.create(user, createOrderDto);
  }

  // 用户上传订单支付凭证（仅记录 URL，不做实际支付）
  async updatePayProof(user: UserEntity, orderId: string, payProofUrl: string) {
    return this.orderService.updatePayProof(user, orderId, payProofUrl);
  }

  async pagination(pagination: Pagination) {
    const { rows, pages, data } = await this.orderService.findAll(pagination);

    const codeIds: string[] = [];
    const orderIds: string[] = [];
    data.forEach((o) => {
      codeIds.push(...[o.province, o.city, o.area]);
      orderIds.push(o.order_id);
    });
    const provinces = await this.prisma.province.findMany({
      where: { code: { in: codeIds } },
    });

    const storeIds = data.map((o) => o.store_id);
    const stores = await this.prisma.store.findMany({
      where: { store_id: { in: storeIds } },
    });

    // 查询所有订单的商品行
    const goodsItems = await this.prisma.user_order_info.findMany({
      where: { order_id: { in: orderIds } },
    });

    // 基于 goods_version_id 一次性查出所有版本信息（含 unit_name 等）
    const versionIds = goodsItems.map((g) => g.goods_version_id);
    const goodsVersions = await this.prisma.store_goods_version.findMany({
      where: { version_id: { in: versionIds } },
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

      // 为当前订单的每个商品挂上版本信息里的 unit_name 等字段
      const items = goodsItems
        .filter((g) => g.order_id === o.order_id)
        .map((g) => {
          const version = goodsVersions.find(
            (v) => v.version_id === g.goods_version_id,
          );
          return {
            ...g,
            unit_name: version?.unit_name,
            version_number: version?.version_number,
            bar_code: version?.bar_code,
          } as typeof g & {
            unit_name?: string;
            version_number?: string | null;
            bar_code?: string | null;
          };
        });

      return {
        ...o,
        province: province_name,
        city: city_name,
        town: town_name,
        area: area_name,
        items,
        _store: store,
      };
    });

    return { rows, pages, data: formatedData };
  }

  findAll() {
    return `This action returns all order`;
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
