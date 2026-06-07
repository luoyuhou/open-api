import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CashierService } from './cashier.service';
import { CashierOrderDto } from './dto/cashier-order.dto';
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

  @Post('order')
  @ApiOperation({ summary: '批量同步离线订单' })
  async pushOrders(@Body() dto: CashierOrderDto) {
    return await this.cashierService.pushOrder(dto);
  }

  @Get('orders/today/:storeId')
  @ApiOperation({ summary: '获取店铺今日成交订单（在线模式）' })
  async getTodayOrders(
    @Param('storeId') storeId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '5',
  ) {
    return await this.cashierService.getTodayOrders(
      storeId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
    );
  }

  @Get('orders/today/:storeId/count')
  @ApiOperation({ summary: '获取店铺今日成交订单数量' })
  async getTodayOrderCount(@Param('storeId') storeId: string) {
    return await this.cashierService.getTodayOrderCount(storeId);
  }
}
