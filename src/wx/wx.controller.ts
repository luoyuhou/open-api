import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WxService } from './wx.service';
import { Request } from 'express';
import { CreateOrderDto } from '../order/dto/create-order.dto';
import { UserEntity } from '../users/entities/user.entity';
import { Pagination } from '../common/dto/pagination';
import { FindAllCategoryDto } from '../store/category/dto/findAll-category.dto';
import { UpdateAddressDto } from '../users/address/dto/update-address.dto';
import { CreateAddressDto } from '../users/address/dto/create-address.dto';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UpdateUserPasswordDto } from '../users/dto/update-user-password.dto';

@UseGuards(SessionAuthGuard)
@Controller('wx')
@ApiTags('wx')
export class WxController {
  constructor(private readonly wxService: WxService) {}

  @Post('order')
  @ApiProperty()
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
  @ApiProperty()
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
  @ApiProperty()
  async orderDetailInfo(@Param('id') id: string) {
    const data = await this.wxService.orderDetailInfo(id);
    return { message: 'ok', data };
  }

  @Put('order/:id')
  @ApiProperty()
  async cancelOrder(@Req() request: Request, @Param('id') id: string) {
    await this.wxService.cancelOrder(id, request.user as UserEntity);
    return { message: 'ok' };
  }

  @Delete('order/:id')
  @ApiProperty()
  async removeOrder(@Req() request: Request, @Param('id') id: string) {
    await this.wxService.removeOrder(id, request.user as UserEntity);
    return { message: 'ok' };
  }

  @Post('store/pagination')
  @ApiProperty()
  async storePagination(@Body() pagination: Pagination) {
    const data = await this.wxService.storePagination(pagination);
    return { message: 'ok', data };
  }

  @Get('store/:id')
  @ApiProperty()
  async storeInfo(@Param('id') id: string) {
    const data = await this.wxService.storeInfo(id);
    return { message: 'ok', data };
  }

  @Get('category/:id')
  @ApiProperty()
  async findCategoryByStoreId(
    @Param('id') id: string,
    @Query() { pid }: FindAllCategoryDto,
  ) {
    const data = await this.wxService.findCategoryByStoreId({
      store_id: id,
      pid,
    });
    return { message: 'ok', data };
  }

  @Post('goods/pagination')
  @ApiProperty()
  async goodsPagination(@Body() pagination: Pagination) {
    const data = await this.wxService.goodsPagination(pagination);
    return { message: 'ok', data };
  }

  @Get('user/address')
  @ApiProperty()
  async getUserAllAddress(@Req() request: Request) {
    const data = await this.wxService.getUserAllAddress(
      request.user as UserEntity,
    );
    return { message: 'ok', data };
  }

  @Get('user/address/:id')
  @ApiProperty()
  async getUserAddress(@Param('id') id: string) {
    const data = await this.wxService.findUserAddress(id);
    return { message: 'ok', data };
  }

  @Put('user/address/:id')
  @ApiProperty()
  async editUserAddress(
    @Param('id') id: string,
    @Req() request: Request,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const data = await this.wxService.editUserAddress(
      id,
      updateAddressDto,
      request.user as UserEntity,
    );
    return { message: 'ok', data };
  }

  @Post('user/address')
  @ApiProperty()
  async createUserAddress(
    @Req() request: Request,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    const data = await this.wxService.createUserAddress(
      request.user as UserEntity,
      createAddressDto,
    );
    return { message: 'ok', data };
  }

  @Put('user/profile')
  async updateUserProfile(
    @Req() request: Request,
    @Body()
    updateUserProfileWithPasswordDto: UpdateUserDto & UpdateUserPasswordDto,
  ) {
    const result = await this.wxService.updateUserProfileWithPassword(
      request.user as UserEntity,
      updateUserProfileWithPasswordDto,
    );

    return { message: 'ok', data: result };
  }
}
