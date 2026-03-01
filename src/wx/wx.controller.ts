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

  @Get('home/banners')
  @ApiProperty()
  async getHomeBanners() {
    const data = await this.wxService.homeBannersForMiniApp();
    return { message: 'ok', data };
  }

  /**
   * 小程序首页推荐商家列表
   * GET /wx/home/recommend-stores?page=1&pageSize=5
   */
  @Get('home/recommend-stores')
  @ApiProperty()
  async getRecommendStores(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '5',
  ) {
    const pageNum = Math.max(0, Number(page) - 1) || 0;
    const size = Math.max(1, Number(pageSize)) || 5;
    const data = await this.wxService.recommendStoresForMiniApp(pageNum, size);
    return { message: 'ok', data };
  }

  /**
   * 用户收藏店铺：添加收藏
   */
  @Post('user/favorites')
  @ApiProperty()
  async addFavoriteStore(
    @Req() request: Request,
    @Body() body: { store_id: string },
  ) {
    await this.wxService.addFavoriteStore(
      request.user as UserEntity,
      body.store_id,
    );
    return { message: 'ok' };
  }

  /**
   * 用户收藏店铺：取消收藏
   */
  @Delete('user/favorites/:storeId')
  @ApiProperty()
  async removeFavoriteStore(
    @Req() request: Request,
    @Param('storeId') storeId: string,
  ) {
    await this.wxService.removeFavoriteStore(
      request.user as UserEntity,
      storeId,
    );
    return { message: 'ok' };
  }

  /**
   * 查询当前店铺是否已收藏
   */
  @Get('user/favorites/:storeId')
  @ApiProperty()
  async isFavoriteStore(
    @Req() request: Request,
    @Param('storeId') storeId: string,
  ) {
    const isFavorite = await this.wxService.isFavoriteStore(
      request.user as UserEntity,
      storeId,
    );
    return { message: 'ok', data: { isFavorite } };
  }

  /**
   * 用户收藏店铺列表
   */
  @Get('user/favorites')
  @ApiProperty()
  async getFavoriteStores(
    @Req() request: Request,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
  ) {
    const pageNum = Math.max(0, Number(page) - 1) || 0;
    const size = Math.max(1, Number(pageSize)) || 10;
    const data = await this.wxService.listFavoriteStores(
      request.user as UserEntity,
      pageNum,
      size,
    );
    return { message: 'ok', data };
  }

  /**
   * 记录用户浏览店铺
   */
  @Post('user/history/store')
  @ApiProperty()
  async recordStoreBrowse(
    @Req() request: Request,
    @Body() body: { store_id: string },
  ) {
    await this.wxService.recordStoreBrowse(
      request.user as UserEntity,
      body.store_id,
    );
    return { message: 'ok' };
  }

  /**
   * 用户浏览店铺记录列表
   */
  @Get('user/history/stores')
  @ApiProperty()
  async getStoreBrowseHistory(
    @Req() request: Request,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
  ) {
    const pageNum = Math.max(0, Number(page) - 1) || 0;
    const size = Math.max(1, Number(pageSize)) || 10;
    const data = await this.wxService.listStoreBrowseHistory(
      request.user as UserEntity,
      pageNum,
      size,
    );
    return { message: 'ok', data };
  }

  /**
   * 删除用户浏览店铺记录
   */
  @Delete('user/history/store/:storeId')
  @ApiProperty()
  async deleteStoreBrowse(
    @Req() request: Request,
    @Param('storeId') storeId: string,
  ) {
    await this.wxService.deleteStoreBrowseHistory(
      request.user as UserEntity,
      storeId,
    );
    return { message: 'ok' };
  }
}
