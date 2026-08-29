import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CashierService } from './cashier.service';
import { CashierOrderDto } from './dto/cashier-order.dto';
import {
  CreatePendingOrderDto,
  UpdatePendingOrderDto,
} from './dto/pending-order.dto';
import { RefundOrderDto } from './dto/refund-order.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { UserEntity } from '../../users/entities/user.entity';
import Utils from '../../common/utils';

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
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: '提交收银结算订单' })
  async pushOrders(
    @Body() dto: CashierOrderDto,
    @Req() request: { user: UserEntity },
  ) {
    return await this.cashierService.pushOrder(dto, request.user);
  }

  @Post('pending-order')
  @ApiOperation({ summary: '创建或更新会员扫码待支付订单' })
  async createPendingOrder(@Body() dto: CreatePendingOrderDto) {
    return await this.cashierService.createOrUpdatePendingOrder(dto);
  }

  @Post('pending-order/:pendingId')
  @ApiOperation({ summary: '更新会员扫码待支付订单' })
  async updatePendingOrder(
    @Param('pendingId') pendingId: string,
    @Body() dto: UpdatePendingOrderDto,
  ) {
    return await this.cashierService.updatePendingOrder(pendingId, dto);
  }

  @Get('pending-order/:pendingId')
  @ApiOperation({ summary: '查询待支付订单状态（店员轮询）' })
  async getPendingOrderStatus(
    @Param('pendingId') pendingId: string,
    @Query('storeId') storeId: string,
  ) {
    return await this.cashierService.getPendingOrderStatus(pendingId, storeId);
  }

  @Get('member-pay/:pendingId')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: '会员扫码支付预览' })
  async getMemberPayPreview(
    @Param('pendingId') pendingId: string,
    @Req() request: { user: UserEntity },
  ) {
    const user = request.user as UserEntity;
    if (!Utils.isRealMobilePhone(user.phone)) {
      throw new BadRequestException('请先绑定手机号后再扫码支付');
    }
    return await this.cashierService.getMemberPayPreview(
      pendingId,
      String(user.phone).trim(),
    );
  }

  @Post('member-pay/:pendingId')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: '会员扫码确认支付' })
  async memberPay(
    @Param('pendingId') pendingId: string,
    @Req() request: { user: UserEntity },
  ) {
    const user = request.user as UserEntity;
    if (!Utils.isRealMobilePhone(user.phone)) {
      throw new BadRequestException('请先绑定手机号后再扫码支付');
    }
    return await this.cashierService.memberPay(
      pendingId,
      String(user.phone).trim(),
    );
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

  @Get('orders/:storeId')
  @ApiOperation({ summary: '分页查询店铺已完成订单，支持手机号检索' })
  async getOrders(
    @Param('storeId') storeId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('phone') phone?: string,
  ) {
    return await this.cashierService.getOrders(
      storeId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
      { phone },
    );
  }

  @Post('order/:orderId/refund')
  @UseGuards(SessionAuthGuard)
  @ApiOperation({
    summary: '店主订单退款：会员退回余额，散客仅登记；积分清理可选',
  })
  async refundOrder(
    @Param('orderId') orderId: string,
    @Body() dto: RefundOrderDto,
    @Req() request: { user: UserEntity },
  ) {
    return await this.cashierService.refundOrder(orderId, request.user, dto);
  }

  @Get('sales/today/:storeId')
  @ApiOperation({ summary: '获取店铺今日各商品销量汇总' })
  async getTodaySalesByGoods(@Param('storeId') storeId: string) {
    return await this.cashierService.getTodaySalesByGoods(storeId);
  }
}
