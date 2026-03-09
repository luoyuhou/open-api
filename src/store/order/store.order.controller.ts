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

  @Post('confirm-payment')
  @ApiOperation({ summary: '商家确认收款' })
  async confirmPayment(
    @Req() req: Request,
    @Body() body: { order_id: string },
  ) {
    const user = req.user as UserEntity;
    return this.storeOrderService.confirmPayment(user, body.order_id);
  }

  @Post('statistics')
  @ApiOperation({ summary: '商家订单总览' })
  async statistics(@Req() req: Request) {
    const user = req.user as UserEntity;
    return this.storeOrderService.getStatistics(user.user_id);
  }

  @Post('trend')
  @ApiOperation({ summary: '商家订单趋势' })
  async trend(@Req() req: Request, @Body() body: { days?: number }) {
    const user = req.user as UserEntity;
    return this.storeOrderService.getTrend(user.user_id, body?.days ?? 10);
  }

  @Post('metrics')
  @ApiOperation({ summary: '商家运营指标' })
  async metrics(@Req() req: Request, @Body() body: { days?: number }) {
    const user = req.user as UserEntity;
    return this.storeOrderService.getMetrics(user.user_id, body?.days ?? 30);
  }

  @Post('daily-report')
  @ApiOperation({ summary: '商家每日订单与商品消耗报表（前一天聚合结果）' })
  async dailyReport(
    @Req() req: Request,
    @Body() body: { recordDate?: string },
  ) {
    const user = req.user as UserEntity;
    return this.storeOrderService.getDailyReport(
      user.user_id,
      body?.recordDate,
    );
  }

  @Post('admin/monthly-trend')
  @ApiOperation({ summary: '后台：按月查看有效订单数量与金额趋势' })
  async adminMonthlyTrend(
    @Req() req: Request,
    @Body() body: { month?: string; store_id?: string },
  ) {
    const user = req.user as UserEntity;
    return this.storeOrderService.getMonthlyTrendForAllStores(
      user.user_id,
      body?.month,
      body?.store_id,
    );
  }
}
