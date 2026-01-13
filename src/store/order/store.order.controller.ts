import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Pagination } from '../../common/dto/pagination';
import { StoreOrderService } from './store.order.service';
import { Request } from 'express';
import { UserEntity } from '../../users/entities/user.entity';

@UseGuards(SessionAuthGuard)
@Controller('store/order')
@ApiTags('store/order')
export class StoreOrderController {
  constructor(private storeOrderService: StoreOrderService) {}

  @Post('pagination')
  async pagination(@Req() req: Request, @Body() pagination: Pagination) {
    const user = req.user as UserEntity;
    return this.storeOrderService.pagination(user.user_id, pagination);
  }

  @Get('detail/:id')
  async findOne(@Param('id') id: string) {
    return this.storeOrderService.orderDetail(id);
  }

  @Get('history/:id')
  @ApiOperation({ summary: '获取订单操作历史记录' })
  async getOrderHistory(@Param('id') id: string) {
    return this.storeOrderService.getOrderHistory(id);
  }

  @Post('accept')
  @ApiOperation({ summary: '商家接单' })
  async acceptOrder(@Req() req: Request, @Body() body: { order_id: string }) {
    const user = req.user as UserEntity;
    return this.storeOrderService.acceptOrder(user, body.order_id);
  }

  @Post('ship')
  @ApiOperation({ summary: '商家发货' })
  async shipOrder(@Req() req: Request, @Body() body: { order_id: string }) {
    const user = req.user as UserEntity;
    return this.storeOrderService.shipOrder(user, body.order_id);
  }

  @Post('statistics')
  @ApiOperation({ summary: '商家订单总览' })
  async statistics(@Req() req: Request) {
    const user = req.user as UserEntity;
    return this.storeOrderService.getStatistics(user.user_id);
  }
}
