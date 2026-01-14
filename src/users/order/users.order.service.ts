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

  async pagination(pagination: Pagination) {
    const { rows, pages, data } = await this.orderService.findAll(pagination);

    const codeIds = [];
    const orderIds = [];
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

    const goodsItems = await this.prisma.user_order_info.findMany({
      where: { order_id: { in: orderIds } },
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

      const items = goodsItems.filter((g) => g.order_id === o.order_id);

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
