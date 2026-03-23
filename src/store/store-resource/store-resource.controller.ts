import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { StoreResourceService } from './store-resource.service';
import { Pagination } from '../../common/dto/pagination';

@UseGuards(SessionAuthGuard)
@Controller('store/resource')
@ApiTags('store/resource')
export class StoreResourceController {
  constructor(private readonly storeResourceService: StoreResourceService) {}

  @Post('pagination')
  @ApiProperty()
  async pagination(@Body() pagination: Pagination) {
    return this.storeResourceService.pagination(pagination);
  }

  @Post('apply-quota')
  async applyQuota(
    @Body() body: { store_id: string; quota_amount: number; price: number },
  ) {
    const data = await this.storeResourceService.createQuotaOrder(body);
    return { data: { ...data, quota_amount: Number(data.quota_amount) } };
  }

  @Post('approve-order/:id')
  async approveOrder(@Param('id', ParseIntPipe) id: number) {
    const data = await this.storeResourceService.approveOrder(id);
    return {
      data: {
        ...data,
        total_quota: Number(data.total_quota),
      },
    };
  }

  @Get('info')
  async getInfo(@Query('store_id') store_id: string) {
    const data = await this.storeResourceService.getStoreResource(store_id);
    const usedQuota = await this.storeResourceService.getUsedQuota(store_id);
    return {
      data: {
        ...data,
        total_quota: Number(data.total_quota),
        used_quota: usedQuota,
      },
    };
  }

  @Get('orders')
  async listOrders(@Query('store_id') store_id: string) {
    const rawRows = await this.storeResourceService.listStoreOrders(store_id);
    const rows = rawRows.map((r) => ({
      ...r,
      quota_amount: Number(r.quota_amount),
    }));
    return { data: rows };
  }

  @Get('used-quota')
  async getUsedQuota(@Query('store_id') store_id: string) {
    const usedQuota = await this.storeResourceService.getUsedQuota(store_id);
    return { data: { store_id, used_quota: usedQuota } };
  }

  @Post('invalidate-quota')
  async invalidateQuota(@Body() body: { store_id: string }) {
    await this.storeResourceService.invalidateUsedQuota(body.store_id);
    return { data: { store_id: body.store_id, message: '缓存已失效' } };
  }
}
