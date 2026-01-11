import { Injectable } from '@nestjs/common';
import { Pagination } from '../../common/dto/pagination';
import { OrderService } from '../../order/order.service';
import { PrismaService } from '../../prisma/prisma.service';

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

    const userIds = data.map((o) => o.user_id);
    const users = await this.prisma.user.findMany({
      where: {
        user_id: { in: userIds },
      },
    });

    const codeIds = [];
    data.forEach((o) => codeIds.push(...[o.province, o.city, o.area]));
    const provinces = await this.prisma.province.findMany({
      where: { code: { in: codeIds } },
    });

    const formatedData = data.map((o) => {
      const store = stores.find((s) => s.store_id === o.store_id);
      const user = users.find((u) => u.user_id === o.user_id);
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
        _user: user,
      };
    });

    return { rows, pages, data: formatedData };
  }
}
