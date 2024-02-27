import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { UpdateWxDto } from './dto/update-wx.dto';
import { UserEntity } from '../users/entities/user.entity';
import { CreateOrderDto } from '../order/dto/create-order.dto';
import { OrderService } from '../order/order.service';
import { Pagination } from '../common/dto/pagination';
import { E_USER_ORDER_STATUS } from '../order/const';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WxService {
  constructor(private prisma: PrismaService) {}

  @Inject(forwardRef(() => OrderService))
  private readonly orderService: OrderService;

  public async createOrder(user: UserEntity, createOrderDto: CreateOrderDto) {
    return this.orderService.create(user, createOrderDto);
  }

  public async orderPagination(pagination: Pagination) {
    return this.orderService.findAll(pagination);
  }

  public async cancelOrder(order_id: string, user: UserEntity) {
    return this.orderService.actionAdapter(
      order_id,
      E_USER_ORDER_STATUS.cancel,
      user,
    );
  }

  public async removeOrder(order_id: string, user: UserEntity) {
    return this.orderService.actionAdapter(
      order_id,
      E_USER_ORDER_STATUS.delete,
      user,
    );
  }

  public async orderDetailInfo(order_id: string) {
    return this.orderService.orderDetailInfo(order_id);
  }

  findAll() {
    return `This action returns all wx`;
  }

  findOne(id: number) {
    return `This action returns a #${id} wx`;
  }

  update(id: number, updateWxDto: UpdateWxDto) {
    return `This action updates a #${id} wx`;
  }

  remove(id: number) {
    return `This action removes a #${id} wx`;
  }
}
