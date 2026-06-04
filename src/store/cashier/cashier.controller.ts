import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CashierService } from './cashier.service';
import { CashierSyncPushDto } from './dto/cashier-sync.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('商家收银')
@Controller('store/cashier')
export class CashierController {
  constructor(private readonly cashierService: CashierService) {}

  @Get('sync/:storeId')
  @ApiOperation({ summary: '同步/拉取收银基础数据（分类、商品）' })
  async getSyncData(@Param('storeId') storeId: string) {
    return await this.cashierService.getSyncData(storeId);
  }

  @Post('sync/orders')
  @ApiOperation({ summary: '批量同步离线订单' })
  async pushOrders(@Body() dto: CashierSyncPushDto) {
    return await this.cashierService.pushOrders(dto);
  }

  @Get('orders/today/:storeId')
  @ApiOperation({ summary: '获取店铺今日成交订单（在线模式）' })
  async getTodayOrders(@Param('storeId') storeId: string) {
    return await this.cashierService.getTodayOrders(storeId);
  }
}
