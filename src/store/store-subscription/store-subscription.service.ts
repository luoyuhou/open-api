import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateStoreServicePlanDto,
  CreateStoreServiceSubscriptionDto,
  PayStoreServiceInvoiceDto,
} from '../dto/store-subscription.dto';

@Injectable()
export class StoreServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans() {
    return this.prisma.store_service_plan.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async createPlan(payload: CreateStoreServicePlanDto) {
    return this.prisma.store_service_plan.create({
      data: {
        name: payload.name.trim(),
        description: payload.description,
        monthly_fee: payload.monthly_fee,
        is_active: true,
      },
    });
  }

  async updatePlanStatus(id: number, is_active: boolean) {
    const plan = await this.prisma.store_service_plan.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new NotFoundException('套餐不存在');
    }
    if (plan.is_active === is_active) {
      return plan;
    }
    return this.prisma.store_service_plan.update({
      where: { id },
      data: { is_active },
    });
  }

  async listSubscriptions(params: {
    store_id?: string;
    status?: number;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = {};
    if (params.store_id) {
      where.store_id = params.store_id;
    }
    if (typeof params.status === 'number') {
      where.status = params.status;
    }

    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize =
      params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

    const [subs, total] = await this.prisma.$transaction([
      this.prisma.store_service_subscription.findMany({
        where,
        orderBy: { create_date: 'desc' },
        include: { plan: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.store_service_subscription.count({ where }),
    ]);

    const storeIds = Array.from(new Set(subs.map((s) => s.store_id)));
    const stores = storeIds.length
      ? await this.prisma.store.findMany({
          where: { store_id: { in: storeIds } },
          select: { store_id: true, store_name: true },
        })
      : [];
    const storeMap = new Map(stores.map((s) => [s.store_id, s.store_name]));
    const items = subs.map((s) => ({
      ...s,
      store_name: storeMap.get(s.store_id) || '',
      plan: s.plan,
    }));

    return { items, total, page, pageSize };
  }

  async createSubscription(payload: CreateStoreServiceSubscriptionDto) {
    const store = await this.prisma.store.findUnique({
      where: { store_id: payload.store_id },
    });
    if (!store) {
      throw new NotFoundException('店铺不存在');
    }
    const plan = await this.prisma.store_service_plan.findUnique({
      where: { id: payload.plan_id },
    });
    if (!plan || !plan.is_active) {
      throw new BadRequestException('套餐不存在或已下线');
    }

    const startDate = payload.start_date
      ? new Date(payload.start_date)
      : new Date();
    const monthStart = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const monthEnd = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const existed = await this.prisma.store_service_subscription.findFirst({
      where: {
        store_id: payload.store_id,
        plan_id: payload.plan_id,
        start_date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });
    if (existed) {
      throw new BadRequestException(
        '同一店铺同一服务套餐在该月已订阅，不能重复订阅',
      );
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = await this.prisma.store_service_subscription.create({
      data: {
        store_id: payload.store_id,
        plan_id: payload.plan_id,
        start_date: startDate,
        end_date: endDate,
        status: 1,
      },
    });

    const month = `${startDate.getFullYear()}-${`${
      startDate.getMonth() + 1
    }`.padStart(2, '0')}`;
    const periodStart = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      1,
    );
    const periodEnd = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0,
    );
    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + 7);

    await this.prisma.store_service_invoice.create({
      data: {
        subscription_id: subscription.id,
        month,
        start_date: periodStart,
        end_date: periodEnd,
        amount: plan.monthly_fee,
        status: 0,
        due_date: dueDate,
      },
    });

    return subscription;
  }

  async terminateSubscription(id: number) {
    const subscription =
      await this.prisma.store_service_subscription.findUnique({
        where: { id },
      });
    if (!subscription) {
      throw new NotFoundException('订阅不存在');
    }
    if (subscription.status !== 1) {
      throw new BadRequestException('仅可以终止生效中的订阅');
    }
    const now = new Date();
    const newEndDate =
      now < subscription.end_date ? now : subscription.end_date;
    return this.prisma.store_service_subscription.update({
      where: { id },
      data: {
        status: 3,
        end_date: newEndDate,
      },
    });
  }

  async listInvoices(params: {
    store_id?: string;
    status?: number;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = {};
    if (params.store_id) {
      where.subscription = { store_id: params.store_id };
    }
    if (typeof params.status === 'number') {
      where.status = params.status;
    }

    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize =
      params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.store_service_invoice.findMany({
        where,
        orderBy: { create_date: 'desc' },
        include: { subscription: { include: { plan: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.store_service_invoice.count({ where }),
    ]);

    const storeIds = Array.from(
      new Set(rows.map((r) => r.subscription.store_id)),
    );
    const stores = storeIds.length
      ? await this.prisma.store.findMany({
          where: { store_id: { in: storeIds } },
          select: { store_id: true, store_name: true },
        })
      : [];
    const storeMap = new Map(stores.map((s) => [s.store_id, s.store_name]));
    const items = rows.map((inv) => ({
      ...inv,
      subscription: {
        ...inv.subscription,
        store_name: storeMap.get(inv.subscription.store_id) || '',
        plan: inv.subscription.plan,
      },
    }));

    return { items, total, page, pageSize };
  }

  async payInvoice(invoiceId: number, payload: PayStoreServiceInvoiceDto) {
    const invoice = await this.prisma.store_service_invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException('账单不存在');
    }
    if (invoice.status === 1) {
      throw new BadRequestException('账单已支付');
    }
    if (!payload.amount || payload.amount <= 0) {
      throw new BadRequestException('支付金额必须大于 0');
    }

    const now = new Date();
    await this.prisma.store_service_payment.create({
      data: {
        invoice_id: invoice.id,
        amount: payload.amount,
        method: payload.method || 'offline',
        remark: payload.remark || null,
        paid_at: now,
      },
    });

    await this.prisma.store_service_invoice.update({
      where: { id: invoice.id },
      data: { status: 1, paid_at: now },
    });

    return { success: true };
  }
}
