import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersOrderService } from './users.order.service';
import { CreateOrderDto } from '../../order/dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { Request } from 'express';
import { UserEntity } from '../entities/user.entity';

@UseGuards(SessionAuthGuard)
@Controller('users/order')
@ApiTags('users/order')
export class UsersOrderController {
  constructor(private readonly userOrderService: UsersOrderService) {}

  @Post()
  create(@Req() request: Request, @Body() createOrderDto: CreateOrderDto) {
    return this.userOrderService.create(
      (request.user as { user: UserEntity }).user,
      createOrderDto,
    );
  }

  @Get()
  findAll() {
    return this.userOrderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userOrderService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.userOrderService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userOrderService.remove(+id);
  }
}
