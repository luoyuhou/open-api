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
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { Request } from 'express';
import { Pagination } from '../../common/dto/pagination';
import { UserEntity } from '../../users/entities/user.entity';

@UseGuards(SessionAuthGuard)
@Controller('store/rating')
@ApiTags('store/rating')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  /**
   * 用户提交商品评价（小程序端）
   */
  @Post()
  @ApiProperty()
  async createRating(
    @Req() request: Request,
    @Body() createRatingDto: CreateRatingDto,
  ) {
    const data = await this.ratingService.createRating(
      createRatingDto,
      request.user as UserEntity,
    );
    return { message: 'ok', data };
  }

  /**
   * 获取商品评价列表
   */
  @Post('goods/:goodsId')
  @ApiProperty()
  async getGoodsRatings(
    @Param('goodsId') goodsId: string,
    @Body() pagination: Pagination,
  ) {
    const data = await this.ratingService.getGoodsRatings(goodsId, pagination);
    return { message: 'ok', data };
  }

  /**
   * 获取店铺评价列表（商家端）
   */
  @Post('store/:storeId')
  @ApiProperty()
  async getStoreRatings(
    @Param('storeId') storeId: string,
    @Body() pagination: Pagination,
  ) {
    const data = await this.ratingService.getStoreRatings(storeId, pagination);
    return { message: 'ok', data };
  }

  /**
   * 获取订单的评价情况
   */
  @Get('order/:orderId')
  @ApiProperty()
  async getOrderRating(@Param('orderId') orderId: string) {
    const data = await this.ratingService.getOrderRating(orderId);
    return { message: 'ok', data };
  }

  /**
   * 隐藏评价（商家端）
   */
  @Patch(':ratingId/hide')
  @ApiProperty()
  async hideRating(
    @Param('ratingId') ratingId: string,
    @Req() request: Request,
  ) {
    await this.ratingService.hideRating(ratingId, request.user as UserEntity);
    return { message: 'ok' };
  }

  /**
   * 显示评价（商家端）
   */
  @Patch(':ratingId/show')
  @ApiProperty()
  async showRating(
    @Param('ratingId') ratingId: string,
    @Req() request: Request,
  ) {
    await this.ratingService.showRating(ratingId, request.user as UserEntity);
    return { message: 'ok' };
  }

  /**
   * 获取店铺评分统计
   */
  @Get('store-stats/:storeId')
  @ApiProperty()
  async getStoreRatingStats(@Param('storeId') storeId: string) {
    const data = await this.ratingService.getStoreRatingStats(storeId);
    return { message: 'ok', data };
  }

  /**
   * 获取店铺评分排名列表（管理端）
   */
  @Post('ranking')
  @ApiProperty()
  async getStoreRanking(@Body() pagination: Pagination) {
    const data = await this.ratingService.getStoreRanking(pagination);
    return { message: 'ok', data };
  }
}
