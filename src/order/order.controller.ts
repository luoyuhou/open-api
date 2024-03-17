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
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { Request } from 'express';
import { UserEntity } from '../users/entities/user.entity';
import { Pagination } from '../common/dto/pagination';
import { RemoveOrderDto } from './dto/remove-order.dto';
import { ApiTags } from '@nestjs/swagger';

@UseGuards(SessionAuthGuard)
@Controller('order')
@ApiTags('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Req() request: Request, @Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(request.user as UserEntity, createOrderDto);
  }

  @Get()
  pagination(@Body() pagination: Pagination) {
    return this.orderService.findAll(pagination);
  }

  @Get('detail:id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(':id')
  update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() { type }: UpdateOrderDto,
  ) {
    return this.orderService.actionAdapter(
      id,
      type,
      request.user as UserEntity,
    );
  }

  @Delete(':id')
  remove(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() { type }: RemoveOrderDto,
  ) {
    return this.orderService.actionAdapter(
      id,
      type,
      request.user as UserEntity,
    );
  }
}
