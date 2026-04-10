import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiProperty } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { RefundService } from './refund.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { HandleRefundDto } from './dto/handle-refund.dto';
import { Request } from 'express';
import { UserEntity } from '../../users/entities/user.entity';
import { Pagination } from '../../common/dto/pagination';

@UseGuards(SessionAuthGuard)
@Controller('store/refund')
@ApiTags('store/refund')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  /**
   * 用户申请退款（小程序端）
   */
  @Post()
  @ApiProperty()
  async createRefund(
    @Req() request: Request,
    @Body() createRefundDto: CreateRefundDto,
  ) {
    const data = await this.refundService.createRefund(
      createRefundDto,
      request.user as UserEntity,
    );
    return { message: 'ok', data };
  }

  /**
   * 获取用户的退款列表（小程序端）
   */
  @Post('user')
  @ApiProperty()
  async getUserRefunds(
    @Req() request: Request,
    @Body() pagination: Pagination & { status?: number },
  ) {
    const data = await this.refundService.getUserRefunds(
      request.user as UserEntity,
      pagination,
    );
    return { message: 'ok', data };
  }

  /**
   * 获取店铺的退款列表（商家端）
   */
  @Post('store/:storeId')
  @ApiProperty()
  async getStoreRefunds(
    @Param('storeId') storeId: string,
    @Body() pagination: Pagination & { status?: number },
  ) {
    const data = await this.refundService.getStoreRefunds(storeId, pagination);
    return { message: 'ok', data };
  }

  /**
   * 获取退款详情
   */
  @Get(':refundId')
  @ApiProperty()
  async getRefundDetail(@Param('refundId') refundId: string) {
    const data = await this.refundService.getRefundDetail(refundId);
    return { message: 'ok', data };
  }

  /**
   * 商家处理退款（同意/拒绝）
   */
  @Post(':refundId/handle')
  @ApiProperty()
  async handleRefund(
    @Param('refundId') refundId: string,
    @Req() request: Request,
    @Body() handleRefundDto: HandleRefundDto,
  ) {
    await this.refundService.handleRefund(
      refundId,
      handleRefundDto,
      request.user as UserEntity,
    );
    return { message: 'ok' };
  }

  /**
   * 用户取消退款申请
   */
  @Patch(':refundId/cancel')
  @ApiProperty()
  async cancelRefund(
    @Param('refundId') refundId: string,
    @Req() request: Request,
  ) {
    await this.refundService.cancelRefund(refundId, request.user as UserEntity);
    return { message: 'ok' };
  }
}
