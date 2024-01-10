import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UserEntity } from '../users/entities/user.entity';
import { PrismaService } from '../prisma/prisma.service';
import { v4 } from 'uuid';
import { E_USER_ORDER_STATUS } from './const';
import { Pagination } from '../common/dto/pagination';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}
  async create(user: UserEntity, createOrderDto: CreateOrderDto) {
    const { user_id } = user;
    const order_id = `order-${v4()}`;
    const { goods, user_address_id } = createOrderDto;
    const money = goods.reduce((t, { price, count }) => t + price * count, 0);
    const formatGoods = goods.map((item) => {
      return { ...item, order_info_id: `order-info-${v4()}`, order_id };
    });

    const userAddress = await this.prisma.user_address.findFirst({
      where: { user_address_id },
    });

    if (!userAddress) {
      throw new BadRequestException('');
    }

    const { province, city, area, town, address, phone, recipient } =
      userAddress;

    await this.prisma.$transaction([
      this.prisma.user_order.create({
        data: {
          ...createOrderDto,
          user_id,
          order_id,
          money,
          province,
          city,
          area,
          town,
          address,
          phone,
          recipient,
          status: E_USER_ORDER_STATUS.create,
        },
      }),
      this.prisma.user_order_info.createMany({ data: formatGoods }),
      this.prisma.user_order_action.create({
        data: {
          order_action_id: `action-${v4()}`,
          order_id,
          user_id,
          status: E_USER_ORDER_STATUS.create,
        },
      }),
    ]);
  }

  findAll(pagination: Pagination) {
    return this.prisma.user_order.findMany();
  }

  findOne(id: string) {
    return this.prisma.user_order_info.findMany({ where: { order_id: id } });
  }

  async cancel(user: UserEntity, id: string) {
    const order = await this.prisma.user_order.findUnique({
      where: { order_id: id, status: E_USER_ORDER_STATUS.create },
    });

    if (!order) {
      throw new BadRequestException('');
    }

    await this.prisma.$transaction([
      this.prisma.user_order.update({
        where: { order_id: id },
        data: { status: E_USER_ORDER_STATUS.cancel },
      }),
      this.prisma.user_order_action.create({
        data: {
          order_id: id,
          status: E_USER_ORDER_STATUS.cancel,
          order_action_id: `action-${v4()}`,
          user_id: user.user_id,
        },
      }),
    ]);
  }

  async delivery(user: UserEntity, id: string) {
    const order = await this.prisma.user_order.findUnique({
      where: { order_id: id, status: E_USER_ORDER_STATUS.create },
    });

    if (!order) {
      throw new BadRequestException('');
    }

    await this.prisma.$transaction([
      this.prisma.user_order.update({
        where: { order_id: id },
        data: { status: E_USER_ORDER_STATUS.delivery },
      }),
      this.prisma.user_order_action.create({
        data: {
          order_id: id,
          user_id: user.user_id,
          order_action_id: `action-${v4()}`,
          status: E_USER_ORDER_STATUS.delivery,
        },
      }),
    ]);
  }

  async receive(user: UserEntity, id: string) {
    const order = await this.prisma.user_order.findUnique({
      where: { order_id: id, status: E_USER_ORDER_STATUS.delivery },
    });

    if (!order) {
      throw new BadRequestException('');
    }

    await this.prisma.$transaction([
      this.prisma.user_order.update({
        where: { order_id: id },
        data: { status: E_USER_ORDER_STATUS.received },
      }),
      this.prisma.user_order_action.create({
        data: {
          order_id: id,
          user_id: user.user_id,
          order_action_id: `action-${v4()}`,
          status: E_USER_ORDER_STATUS.received,
        },
      }),
    ]);
  }

  async finish(user: UserEntity, id: string) {
    const order = await this.prisma.user_order.findUnique({
      where: { order_id: id, status: E_USER_ORDER_STATUS.received },
    });

    if (!order) {
      throw new BadRequestException('');
    }

    await this.prisma.$transaction([
      this.prisma.user_order.update({
        where: { order_id: id },
        data: { status: E_USER_ORDER_STATUS.finished },
      }),
      this.prisma.user_order_action.create({
        data: {
          order_id: id,
          user_id: user.user_id,
          order_action_id: `action-${v4()}`,
          status: E_USER_ORDER_STATUS.finished,
        },
      }),
    ]);
  }

  async remove(user: UserEntity, id: string) {
    const order = await this.prisma.user_order.findUnique({
      where: { order_id: id },
    });

    if (!order) {
      throw new BadRequestException('');
    }

    if (
      [E_USER_ORDER_STATUS.delivery, E_USER_ORDER_STATUS.received].includes(
        order.status,
      )
    ) {
      throw new BadRequestException('');
    }

    await this.prisma.$transaction([
      this.prisma.user_order.update({
        where: { order_id: id },
        data: { status: E_USER_ORDER_STATUS.delete },
      }),
      this.prisma.user_order_action.create({
        data: {
          order_id: id,
          user_id: user.user_id,
          order_action_id: `action-${v4()}`,
          status: E_USER_ORDER_STATUS.delete,
        },
      }),
    ]);
  }

  async actionAdapter(id: string, type: E_USER_ORDER_STATUS, user: UserEntity) {
    if (type === E_USER_ORDER_STATUS.cancel) {
      return this.cancel(user, id);
    }

    if (type === E_USER_ORDER_STATUS.delivery) {
      return this.delivery(user, id);
    }

    if (type === E_USER_ORDER_STATUS.received) {
      return this.receive(user, id);
    }

    if (type === E_USER_ORDER_STATUS.finished) {
      return this.finish(user, id);
    }

    if (type === E_USER_ORDER_STATUS.delete) {
      return this.finish(user, id);
    }

    throw new BadRequestException('');
  }
}
