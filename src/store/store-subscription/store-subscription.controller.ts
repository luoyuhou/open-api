import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { StoreServiceService } from './store-subscription.service';
import {
  CreateStoreServicePlanDto,
  CreateStoreServiceSubscriptionDto,
  ListStoreServiceInvoicesDto,
  ListStoreServiceSubscriptionsDto,
  PayStoreServiceInvoiceDto,
  UpdateStoreServicePlanStatusDto,
  ListStoreServiceContractsDto,
  CreateStoreServiceContractDto,
} from '../dto/store-subscription.dto';

@UseGuards(SessionAuthGuard)
@Controller('store-service')
@ApiTags('store-service')
export class StoreServiceController {
  constructor(private readonly storeService: StoreServiceService) {}

  @Get('plans')
  async listPlans() {
    const data = await this.storeService.listPlans();
    return { data };
  }

  @Post('plans')
  async createPlan(@Body() body: CreateStoreServicePlanDto) {
    const data = await this.storeService.createPlan(body);
    return { data };
  }

  @Post('plans/:id/status')
  async updatePlanStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateStoreServicePlanStatusDto,
  ) {
    const data = await this.storeService.updatePlanStatus(id, body.is_active);
    return { data };
  }

  @Get('subscriptions')
  async listSubscriptions(@Query() query: ListStoreServiceSubscriptionsDto) {
    const { items, total, page, pageSize } =
      await this.storeService.listSubscriptions({
        store_id: query.store_id,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      });
    return {
      data: items,
      total,
      page: page || 1,
      pageSize: pageSize || 20,
    };
  }

  @Post('subscriptions')
  async createSubscription(@Body() body: CreateStoreServiceSubscriptionDto) {
    const data = await this.storeService.createSubscription({
      store_id: body.store_id,
      plan_id: Number(body.plan_id),
      start_date: body.start_date,
    });
    return { data };
  }

  @Post('subscriptions/:id/terminate')
  async terminateSubscription(@Param('id', ParseIntPipe) id: number) {
    const data = await this.storeService.terminateSubscription(id);
    return { data };
  }

  @Get('invoices')
  async listInvoices(@Query() query: ListStoreServiceInvoicesDto) {
    const { items, total, page, pageSize } =
      await this.storeService.listInvoices({
        store_id: query.store_id,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      });
    return {
      data: items,
      total,
      page: page || 1,
      pageSize: pageSize || 20,
    };
  }

  @Post('invoices/:id/pay')
  async payInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PayStoreServiceInvoiceDto,
  ) {
    const data = await this.storeService.payInvoice(id, body);
    return { data };
  }

  @Get('contracts')
  async listContracts(@Query() query: ListStoreServiceContractsDto) {
    const { items, total, page, pageSize } =
      await this.storeService.listContracts({
        store_id: query.store_id,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      });
    return {
      data: items,
      total,
      page: page || 1,
      pageSize: pageSize || 20,
    };
  }

  @Post('contracts')
  async createContract(@Body() body: CreateStoreServiceContractDto) {
    const data = await this.storeService.createContract(body);
    return { data };
  }
}
