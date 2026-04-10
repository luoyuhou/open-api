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
import { StoreSubscriptionService } from './store-subscription.service';
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
@Controller('store/service')
@ApiTags('store/service')
export class StoreServiceController {
  constructor(
    private readonly storeSubscriptionService: StoreSubscriptionService,
  ) {}

  @Get('plans')
  async listPlans(@Query('store_id') storeId?: string) {
    const data = await this.storeSubscriptionService.listPlans(storeId);
    return { data };
  }

  @Post('plans')
  async createPlan(@Body() body: CreateStoreServicePlanDto) {
    const data = await this.storeSubscriptionService.createPlan(body);
    return { data };
  }

  @Post('plans/:id/status')
  async updatePlanStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateStoreServicePlanStatusDto,
  ) {
    const data = await this.storeSubscriptionService.updatePlanStatus(
      id,
      body.is_active,
    );
    return { data };
  }

  @Get('subscriptions')
  async listSubscriptions(@Query() query: ListStoreServiceSubscriptionsDto) {
    const { items, total, page, pageSize } =
      await this.storeSubscriptionService.listSubscriptions({
        store_id: query.store_id,
        status: query.status !== undefined ? Number(query.status) : undefined,
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
    const data = await this.storeSubscriptionService.createSubscription({
      store_id: body.store_id,
      plan_id: body.plan_id,
      start_date: body.start_date,
    });
    return { data };
  }

  @Post('subscriptions/:id/terminate')
  async terminateSubscription(@Param('id', ParseIntPipe) id: number) {
    const data = await this.storeSubscriptionService.terminateSubscription(id);
    return { data };
  }

  @Get('invoices')
  async listInvoices(@Query() query: ListStoreServiceInvoicesDto) {
    const { items, total, page, pageSize } =
      await this.storeSubscriptionService.listInvoices({
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
    const data = await this.storeSubscriptionService.payInvoice(id, body);
    return { data };
  }

  @Get('contracts')
  async listContracts(@Query() query: ListStoreServiceContractsDto) {
    const { items, total, page, pageSize } =
      await this.storeSubscriptionService.listContracts({
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
    const data = await this.storeSubscriptionService.createContract(body);
    return { data };
  }

  @Post('subscriptions/:id/approve')
  async approveSubscription(@Param('id', ParseIntPipe) id: number) {
    const data = await this.storeSubscriptionService.approveSubscription(id);
    return { data };
  }

  @Get('pending-subscriptions')
  async listPendingSubscriptions() {
    const data = await this.storeSubscriptionService.listPendingSubscriptions();
    return { data };
  }
}
