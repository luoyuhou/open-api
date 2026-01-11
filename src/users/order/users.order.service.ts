import { Injectable } from '@nestjs/common';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateOrderDto } from '../../order/dto/create-order.dto';
import { UserEntity } from '../entities/user.entity';
import { OrderService } from '../../order/order.service';

@Injectable()
export class UsersOrderService {
  constructor(private orderService: OrderService) {}

  create(user: UserEntity, createOrderDto: CreateOrderDto) {
    return this.orderService.create(user, createOrderDto);
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
