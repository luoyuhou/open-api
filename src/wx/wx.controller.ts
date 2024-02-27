import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Req,
} from '@nestjs/common';
import { WxService } from './wx.service';
import { UpdateWxDto } from './dto/update-wx.dto';
import { Request } from 'express';
import { CreateOrderDto } from '../order/dto/create-order.dto';
import { UserEntity } from '../users/entities/user.entity';
import { Pagination } from '../common/dto/pagination';

@Controller('wx')
export class WxController {
  constructor(private readonly wxService: WxService) {}

  @Post('order')
  async createOrder(
    @Req() request: Request,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    const data = await this.wxService.createOrder(
      request.user as UserEntity,
      createOrderDto,
    );

    return { message: 'ok', data };
  }

  @Post('order/pagination')
  async orderPagination(
    @Req() request: Request,
    @Body() pagination: Pagination,
  ) {
    const data = await this.wxService.orderPagination({
      ...pagination,
      filtered: pagination.filtered.concat({
        id: 'user_id',
        value: (request.user as UserEntity).user_id,
      }),
    });
    return { message: 'ok', data };
  }

  @Get('order/:id/detail')
  async orderDetailInfo(@Param('id') id: string) {
    const data = await this.wxService.orderDetailInfo(id);
    return { message: 'ok', data };
  }

  @Put('order/:id')
  async cancelOrder(@Req() request: Request, @Param('id') id: string) {
    await this.wxService.cancelOrder(id, request.user as UserEntity);
    return { message: 'ok' };
  }

  @Delete('order/:id')
  async removeOrder(@Req() request: Request, @Param('id') id: string) {
    await this.wxService.removeOrder(id, request.user as UserEntity);
    return { message: 'ok' };
  }

  @Get()
  findAll() {
    return this.wxService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.wxService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWxDto: UpdateWxDto) {
    return this.wxService.update(+id, updateWxDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.wxService.remove(+id);
  }
}
