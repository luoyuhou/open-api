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
  CreateStoreServiceContractDto,
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.store_service_subscription.count({ where }),
    ]);

    // 手动查询关联数据
    const storeIds = Array.from(new Set(subs.map((s) => s.store_id)));
    const planIds = Array.from(new Set(subs.map((s) => s.plan_id)));
    const contractIds = Array.from(
      new Set(subs.filter((s) => s.contract_id).map((s) => s.contract_id)),
    );
    const subscriptionIds = Array.from(new Set(subs.map((s) => s.id)));

    const [stores, plans, contracts, invoices] = await Promise.all([
      storeIds.length
        ? this.prisma.store.findMany({
            where: { store_id: { in: storeIds } },
            select: { store_id: true, store_name: true },
          })
        : Promise.resolve([]),
      planIds.length
        ? this.prisma.store_service_plan.findMany({
            where: { plan_id: { in: planIds } },
          })
        : Promise.resolve([]),
      contractIds.length
        ? this.prisma.store_service_contract.findMany({
            where: { id: { in: contractIds } },
          })
        : Promise.resolve([]),
      subscriptionIds.length
        ? this.prisma.store_service_invoice.findMany({
            where: { subscription_id: { in: subscriptionIds } },
            orderBy: { create_date: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const storeMap = new Map(stores.map((s) => [s.store_id, s.store_name]));
    const planMap = new Map(plans.map((p) => [p.plan_id, p]));
    const contractMap = new Map(contracts.map((c) => [c.id, c]));
    const invoiceMap = new Map<number, typeof invoices>();
    invoices.forEach((inv) => {
      const arr = invoiceMap.get(inv.subscription_id) || [];
      arr.push(inv);
      invoiceMap.set(inv.subscription_id, arr);
    });

    const items = subs.map((s) => ({
      ...s,
      store_name: storeMap.get(s.store_id) || '',
      plan: planMap.get(s.plan_id) || null,
      contract: s.contract_id ? contractMap.get(s.contract_id) || null : null,
      invoices: invoiceMap.get(s.id) || [],
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
      where: { plan_id: payload.plan_id },
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

    // 计算费用逻辑
    let amount = plan.monthly_fee; // 基础费用 50
    let orderCountLastCycle = 0;

    // 检查是否是首次订阅
    const previousSub = await this.prisma.store_service_subscription.findFirst({
      where: { store_id: payload.store_id },
      orderBy: { end_date: 'desc' },
    });

    if (previousSub) {
      // 不是首次订阅，需要累加上个周期的有效订单数
      // 假设上个周期是上个月
      const lastMonthStart = new Date(startDate);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

      orderCountLastCycle = await this.prisma.user_order.count({
        where: {
          store_id: payload.store_id,
          stage: { in: [4, 5] }, // received=4, finished=5
          create_date: {
            gte: previousSub.start_date,
            lte: previousSub.end_date,
          },
        },
      });
      amount += orderCountLastCycle;
    }

    const subscription = await this.prisma.store_service_subscription.create({
      data: {
        store_id: payload.store_id,
        plan_id: payload.plan_id,
        start_date: startDate,
        end_date: endDate,
        status: 0, // 初始为 0 (待确认/待支付)，管理员确认后变为 1
        is_infinite: true,
        order_count_last_cycle: orderCountLastCycle,
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
        amount: amount, // 使用计算后的金额
        status: 0,
        due_date: dueDate,
      },
    });

    return subscription;
  }

  /**
   * 管理员确认订阅（激活无限额度）
   */
  async approveSubscription(id: number) {
    const sub = await this.prisma.store_service_subscription.findUnique({
      where: { id },
    });
    if (!sub) {
      throw new NotFoundException('订阅记录不存在');
    }

    return this.prisma.store_service_subscription.update({
      where: { id },
      data: { status: 1 },
    });
  }

  /**
   * 获取待审批的订阅
   */
  async listPendingSubscriptions() {
    const subs = await this.prisma.store_service_subscription.findMany({
      where: { status: 0 },
      orderBy: { create_date: 'desc' },
    });

    const planIds = Array.from(new Set(subs.map((s) => s.plan_id)));
    const plans = planIds.length
      ? await this.prisma.store_service_plan.findMany({
          where: { plan_id: { in: planIds } },
        })
      : [];
    const planMap = new Map(plans.map((p) => [p.plan_id, p]));

    return subs.map((s) => ({
      ...s,
      plan: planMap.get(s.plan_id) || null,
    }));
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
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize =
      params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

    // 如果有 store_id，先查找对应的订阅
    let subscriptionIds: number[] = [];
    if (params.store_id) {
      const subs = await this.prisma.store_service_subscription.findMany({
        where: { store_id: params.store_id },
        select: { id: true },
      });
      subscriptionIds = subs.map((s) => s.id);
    }

    const where: any = {};
    if (params.store_id) {
      where.subscription_id = { in: subscriptionIds };
    }
    if (typeof params.status === 'number') {
      where.status = params.status;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.store_service_invoice.findMany({
        where,
        orderBy: { create_date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.store_service_invoice.count({ where }),
    ]);

    // 手动查询关联数据
    const invSubscriptionIds = Array.from(
      new Set(rows.map((r) => r.subscription_id)),
    );
    const [subscriptions, stores, plans] = await Promise.all([
      invSubscriptionIds.length
        ? this.prisma.store_service_subscription.findMany({
            where: { id: { in: invSubscriptionIds } },
          })
        : Promise.resolve([]),
      Promise.resolve([]), // storeIds 将在下面处理
      Promise.resolve([]),
    ]);

    const storeIds = Array.from(new Set(subscriptions.map((s) => s.store_id)));
    const planIds = Array.from(new Set(subscriptions.map((s) => s.plan_id)));

    const [storeList, planList] = await Promise.all([
      storeIds.length
        ? this.prisma.store.findMany({
            where: { store_id: { in: storeIds } },
            select: { store_id: true, store_name: true },
          })
        : Promise.resolve([]),
      planIds.length
        ? this.prisma.store_service_plan.findMany({
            where: { plan_id: { in: planIds } },
          })
        : Promise.resolve([]),
    ]);

    const subMap = new Map(subscriptions.map((s) => [s.id, s]));
    const storeMap = new Map(storeList.map((s) => [s.store_id, s.store_name]));
    const planMap = new Map(planList.map((p) => [p.plan_id, p]));

    const items = rows.map((inv) => {
      const sub = subMap.get(inv.subscription_id);
      return {
        ...inv,
        subscription: sub
          ? {
              ...sub,
              store_name: storeMap.get(sub.store_id) || '',
              plan: planMap.get(sub.plan_id) || null,
            }
          : null,
      };
    });

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

  async listContracts(params: {
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

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.store_service_contract.findMany({
        where,
        orderBy: { create_date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.store_service_contract.count({ where }),
    ]);

    const storeIds = Array.from(new Set(rows.map((r) => r.store_id)));
    const planIds = Array.from(new Set(rows.map((r) => r.plan_id)));
    const [stores, plans] = await Promise.all([
      storeIds.length
        ? this.prisma.store.findMany({
            where: { store_id: { in: storeIds } },
            select: { store_id: true, store_name: true },
          })
        : Promise.resolve([]),
      planIds.length
        ? this.prisma.store_service_plan.findMany({
            where: { plan_id: { in: planIds } },
            select: { plan_id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const storeMap = new Map(stores.map((s) => [s.store_id, s.store_name]));
    const planMap = new Map(plans.map((p) => [p.plan_id, p.name]));

    const items = rows.map((c) => ({
      ...c,
      store_name: storeMap.get(c.store_id) || '',
      plan_name: planMap.get(c.plan_id) || '',
    }));

    return { items, total, page, pageSize };
  }

  async createContract(payload: CreateStoreServiceContractDto) {
    const store = await this.prisma.store.findUnique({
      where: { store_id: payload.store_id },
    });
    if (!store) {
      throw new NotFoundException('店铺不存在');
    }

    const plan = await this.prisma.store_service_plan.findUnique({
      where: { plan_id: payload.plan_id },
    });
    if (!plan) {
      throw new NotFoundException('套餐不存在');
    }

    const start = new Date(payload.start_date);
    const end = new Date(payload.end_date);
    if (end <= start) {
      throw new BadRequestException('合同结束日期必须大于开始日期');
    }

    const contractNo =
      payload.contract_no && payload.contract_no.trim().length > 0
        ? payload.contract_no.trim()
        : `HT${Date.now()}`;

    return this.prisma.store_service_contract.create({
      data: {
        contract_no: contractNo,
        store_id: payload.store_id,
        plan_id: payload.plan_id,
        start_date: start,
        end_date: end,
        status: 1,
        sign_type: payload.sign_type,
        signed_at: payload.signed_at || null,
        total_amount: payload.total_amount,
        file_url: payload.file_url || null,
      },
    });
  }
}
