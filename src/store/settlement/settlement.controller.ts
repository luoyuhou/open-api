import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { StoreSettlementService } from './store-settlement.service';
import { PlatformSettlementService } from './platform-settlement.service';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@Controller('store/settlement')
@UseGuards(SessionAuthGuard)
@ApiTags('store/settlement')
export class SettlementController {
  constructor(
    private readonly storeSettlementService: StoreSettlementService,
    private readonly platformSettlementService: PlatformSettlementService,
  ) {}

  // ========== 商家结算 ==========

  /**
   * 生成商家月度结算（管理员）
   */
  @Post('store/generate')
  async generateStoreSettlement(
    @Body() body: { storeId?: string; month?: string },
  ) {
    const result = await this.storeSettlementService.generateMonthlySettlement(
      body.storeId,
      body.month,
    );
    return { data: result };
  }

  /**
   * 获取商家结算列表
   */
  @Get('store/list')
  async listStoreSettlements(
    @Query('storeId') storeId?: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.storeSettlementService.listSettlements({
      storeId,
      month,
      status: status ? Number(status) : undefined,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    return { data: result };
  }

  /**
   * 获取商家结算详情
   */
  @Get('store/:id')
  async getStoreSettlementDetail(@Param('id') settlementId: string) {
    const result = await this.storeSettlementService.getSettlementDetail(
      settlementId,
    );
    return { data: result };
  }

  /**
   * 确认商家结算
   */
  @Post('store/:id/confirm')
  async confirmStoreSettlement(@Param('id') settlementId: string) {
    const result = await this.storeSettlementService.confirmSettlement(
      settlementId,
    );
    return { data: result };
  }

  /**
   * 完成商家结算
   */
  @Post('store/:id/settle')
  async settleStoreSettlement(@Param('id') settlementId: string) {
    const result = await this.storeSettlementService.settleSettlement(
      settlementId,
    );
    return { data: result };
  }

  /**
   * 获取商家结算统计
   */
  @Get('store/stats/:storeId')
  async getStoreSettlementStats(@Param('storeId') storeId: string) {
    const result = await this.storeSettlementService.getStoreSettlementStats(
      storeId,
    );
    return { data: result };
  }

  // ========== 平台结算 ==========

  /**
   * 生成平台月度结算（管理员）
   */
  @Post('platform/generate')
  async generatePlatformSettlement(@Body() body: { month?: string }) {
    const result =
      await this.platformSettlementService.generateMonthlySettlement(
        body.month,
      );
    return { data: result };
  }

  /**
   * 获取平台结算列表
   */
  @Get('platform/list')
  async listPlatformSettlements(
    @Query('month') month?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.platformSettlementService.listSettlements({
      month,
      status: status ? Number(status) : undefined,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    return { data: result };
  }

  /**
   * 获取平台结算详情
   */
  @Get('platform/:id')
  async getPlatformSettlementDetail(@Param('id') settlementId: string) {
    const result = await this.platformSettlementService.getSettlementDetail(
      settlementId,
    );
    return { data: result };
  }

  /**
   * 确认平台结算
   */
  @Post('platform/:id/confirm')
  async confirmPlatformSettlement(@Param('id') settlementId: string) {
    const result = await this.platformSettlementService.confirmSettlement(
      settlementId,
    );
    return { data: result };
  }

  /**
   * 完成平台结算
   */
  @Post('platform/:id/settle')
  async settlePlatformSettlement(@Param('id') settlementId: string) {
    const result = await this.platformSettlementService.settleSettlement(
      settlementId,
    );
    return { data: result };
  }

  /**
   * 获取平台结算统计
   */
  @Get('platform/stats')
  async getPlatformSettlementStats() {
    const result =
      await this.platformSettlementService.getPlatformSettlementStats();
    return { data: result };
  }
}
