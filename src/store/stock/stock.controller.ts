import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiProperty } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { StockService } from './stock.service';
import { UpdateStockDto } from './dto/update-stock.dto';
import { Request } from 'express';
import { UserEntity } from 'src/users/entities/user.entity';

@UseGuards(SessionAuthGuard)
@Controller('store/stock')
@ApiTags('store/stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  /**
   * 获取店铺库存预警列表
   */
  @Get('warning/:storeId')
  @ApiProperty()
  async getStockWarningList(@Param('storeId') storeId: string) {
    const data = await this.stockService.getStockWarningList(storeId);
    return { message: 'ok', data };
  }

  /**
   * 更新商品库存
   */
  @Post('update')
  @ApiProperty()
  async updateStock(
    @Req() request: Request,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    await this.stockService.updateStock(
      updateStockDto,
      request.user as UserEntity,
    );
    return { message: 'ok' };
  }

  /**
   * 批量更新库存预警阈值
   */
  @Post('warning-threshold')
  @ApiProperty()
  async updateWarningThreshold(
    @Req() request: Request,
    @Body() body: { versionId: string; threshold: number },
  ) {
    await this.stockService.updateWarningThreshold(
      body.versionId,
      body.threshold,
      request.user as UserEntity,
    );
    return { message: 'ok' };
  }
}
