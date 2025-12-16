import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UserEntity } from '../users/entities/user.entity';
import { PrismaService } from '../prisma/prisma.service';
import { v4 } from 'uuid';
import { E_USER_ORDER_STAGE, E_USER_ORDER_STATUS } from './const';
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
          status: E_USER_ORDER_STATUS.active,
          stage: E_USER_ORDER_STAGE.create,
        },
      }),
      // SQLite 不支持 createMany，使用 Promise.all 批量创建
      ...formatGoods.map((good) =>
        this.prisma.user_order_info.create({ data: good }),
      ),
      this.prisma.user_order_action.create({
        data: {
          order_action_id: `action-${v4()}`,
          order_id,
          user_id,
          status: E_USER_ORDER_STAGE.create,
        },
      }),
    ]);
  }

  public async findAll(pagination: Pagination) {
    const { filtered, pageNum, pageSize, sorted } = pagination;
    const where = {};
    filtered.forEach(({ id, value }) => {
      if (['create_date', 'update_date'].includes(id)) {
        return;
      }

      if (Array.isArray(value)) {
        where[id] = { in: value };
        return;
      }

      where[id] = value;
    });

    const order = sorted.length ? sorted[0] : { id: 'create_date', desc: true };

    const data = await this.prisma.user_order.findMany({
      where: where,
      orderBy: { [order.id]: order.desc ? 'desc' : 'acs' },
      take: pageSize,
      skip: pageNum * pageNum,
    });

    const count = await this.prisma.user_order.count({ where });

    return { rows: count, pages: Math.ceil(count / pageSize), data };
  }

  findOne(id: string) {
    return this.prisma.user_order_info.findMany({ where: { order_id: id } });
  }

  async cancel(user: UserEntity, id: string) {
    const order = await this.prisma.user_order.findUnique({
      where: { order_id: id, status: E_USER_ORDER_STATUS.active },
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
      where: {
        order_id: id,
        status: E_USER_ORDER_STATUS.active,
        stage: E_USER_ORDER_STAGE.create,
      },
    });

    if (!order) {
      throw new BadRequestException('');
    }

    await this.prisma.$transaction([
      this.prisma.user_order.update({
        where: { order_id: id },
        data: { stage: E_USER_ORDER_STAGE.delivery },
      }),
      this.prisma.user_order_action.create({
        data: {
          order_id: id,
          user_id: user.user_id,
          order_action_id: `action-${v4()}`,
          status: E_USER_ORDER_STAGE.delivery,
        },
      }),
    ]);
  }

  async receive(user: UserEntity, id: string) {
    const order = await this.prisma.user_order.findUnique({
      where: {
        order_id: id,
        status: E_USER_ORDER_STATUS.active,
        stage: E_USER_ORDER_STAGE.delivery,
      },
    });

    if (!order) {
      throw new BadRequestException('');
    }

    await this.prisma.$transaction([
      this.prisma.user_order.update({
        where: { order_id: id },
        data: { status: E_USER_ORDER_STAGE.received },
      }),
      this.prisma.user_order_action.create({
        data: {
          order_id: id,
          user_id: user.user_id,
          order_action_id: `action-${v4()}`,
          status: E_USER_ORDER_STAGE.received,
        },
      }),
    ]);
  }

  async finish(user: UserEntity, id: string) {
    const order = await this.prisma.user_order.findUnique({
      where: {
        order_id: id,
        status: E_USER_ORDER_STATUS.active,
        stage: E_USER_ORDER_STAGE.received,
      },
    });

    if (!order) {
      throw new BadRequestException('');
    }

    await this.prisma.$transaction([
      this.prisma.user_order.update({
        where: { order_id: id },
        data: { stage: E_USER_ORDER_STAGE.finished },
      }),
      this.prisma.user_order_action.create({
        data: {
          order_id: id,
          user_id: user.user_id,
          order_action_id: `action-${v4()}`,
          status: E_USER_ORDER_STAGE.finished,
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
      [E_USER_ORDER_STAGE.delivery, E_USER_ORDER_STAGE.received].includes(
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

  async actionAdapter(
    id: string,
    type: E_USER_ORDER_STATUS | E_USER_ORDER_STAGE,
    user: UserEntity,
  ) {
    if (type === E_USER_ORDER_STATUS.cancel) {
      return this.cancel(user, id);
    }

    if (type === E_USER_ORDER_STAGE.delivery) {
      return this.delivery(user, id);
    }

    if (type === E_USER_ORDER_STAGE.received) {
      return this.receive(user, id);
    }

    if (type === E_USER_ORDER_STAGE.finished) {
      return this.finish(user, id);
    }

    if (type === E_USER_ORDER_STATUS.delete) {
      return this.finish(user, id);
    }

    throw new BadRequestException('');
  }

  public async orderDetailInfo(order_id: string) {
    return this.prisma.user_order_info.findMany({ where: { order_id } });
  }
}
