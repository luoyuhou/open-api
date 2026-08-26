import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from '../users/entities/user.entity';
import { v4 } from 'uuid';
import { Pagination } from '../common/dto/pagination';
import {
  FREE_MEMBERS_PER_STORE,
  FREE_STORES_PER_USER,
  MEMBER_QUOTA_PRICES,
  PLATFORM_CODE_STATUS,
  PLATFORM_ORDER_STATUS,
  PLATFORM_ORDER_TYPE,
  PLATFORM_SETTING_KEYS,
} from './platform.const';
import { CreateQuotaOrderDto } from './dto/create-quota-order.dto';
import { ValidateCodeDto } from './dto/validate-code.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  private assertBoundPhone(user: UserEntity) {
    const phone = String(user?.phone || '').trim();
    if (!phone || phone.startsWith('tmp') || /^\d{13}$/.test(phone)) {
      throw new BadRequestException('请先绑定手机号');
    }
    return phone;
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private async createUniqueCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = this.generateCode();
      const exists = await this.prisma.platform_activation_code.findUnique({
        where: { code },
      });
      if (!exists) return code;
    }
    throw new BadRequestException('验证码生成失败，请重试');
  }

  async getStoreQuotaCheck(user: UserEntity) {
    const count = await this.prisma.store.count({
      where: { user_id: user.user_id },
    });
    return {
      storeCount: count,
      freeLimit: FREE_STORES_PER_USER,
      needsCode: count >= FREE_STORES_PER_USER,
    };
  }

  async getMemberQuotaInfo(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { store_id: storeId },
    });
    if (!store) {
      throw new NotFoundException('店铺不存在');
    }

    const usedCount = await (this.prisma as any).store_member.count({
      where: { store_id: storeId, status: 1 },
    });

    const extraLimit = store.extra_member_limit || 0;
    const totalLimit = FREE_MEMBERS_PER_STORE + extraLimit;

    return {
      freeLimit: FREE_MEMBERS_PER_STORE,
      extraLimit,
      totalLimit,
      usedCount,
      remaining: Math.max(0, totalLimit - usedCount),
      atLimit: usedCount >= totalLimit,
      quotaOptions: Object.entries(MEMBER_QUOTA_PRICES).map(
        ([amount, price]) => ({
          amount: Number(amount),
          price,
          priceYuan: (price / 100).toFixed(2),
        }),
      ),
    };
  }

  async assertCanAddMember(storeId: string) {
    const info = await this.getMemberQuotaInfo(storeId);
    if (info.atLimit) {
      throw new BadRequestException(
        `会员已达上限（${info.totalLimit}人），请购买扩容验证码`,
      );
    }
    return info;
  }

  async createQuotaOrder(user: UserEntity, dto: CreateQuotaOrderDto) {
    const phone = this.assertBoundPhone(user);

    let amount = 0;
    let storeId: string | null = null;
    let quotaAmount: number | null = null;

    if (dto.order_type === PLATFORM_ORDER_TYPE.STORE_CREATE) {
      const check = await this.getStoreQuotaCheck(user);
      if (!check.needsCode) {
        throw new BadRequestException('当前无需购买门店验证码');
      }
      amount = 0;
    } else if (dto.order_type === PLATFORM_ORDER_TYPE.MEMBER_QUOTA) {
      if (!dto.store_id) {
        throw new BadRequestException('请指定门店');
      }
      if (!dto.quota_amount || !MEMBER_QUOTA_PRICES[dto.quota_amount]) {
        throw new BadRequestException('请选择有效的扩容人数');
      }
      const store = await this.prisma.store.findUnique({
        where: { store_id: dto.store_id },
      });
      if (!store) {
        throw new NotFoundException('店铺不存在');
      }
      storeId = dto.store_id;
      quotaAmount = dto.quota_amount;
      amount = MEMBER_QUOTA_PRICES[dto.quota_amount];
    } else {
      throw new BadRequestException('无效的订单类型');
    }

    const order = await this.prisma.platform_quota_order.create({
      data: {
        order_id: `pqo-${v4()}`,
        user_id: user.user_id,
        phone,
        order_type: dto.order_type,
        store_id: storeId,
        quota_amount: quotaAmount,
        amount,
        status: PLATFORM_ORDER_STATUS.PENDING,
      },
    });

    return order;
  }

  async listMyOrders(user: UserEntity) {
    const orders = await this.prisma.platform_quota_order.findMany({
      where: { user_id: user.user_id },
      orderBy: { create_date: 'desc' },
    });

    const orderIds = orders
      .filter((o) => o.status === PLATFORM_ORDER_STATUS.CONFIRMED)
      .map((o) => o.order_id);

    const codes =
      orderIds.length > 0
        ? await this.prisma.platform_activation_code.findMany({
            where: { order_id: { in: orderIds } },
          })
        : [];

    const codeMap = new Map(codes.map((c) => [c.order_id, c]));

    return orders.map((o) => ({
      ...o,
      activationCode: codeMap.get(o.order_id) || null,
    }));
  }

  async paginationOrders(pagination: Pagination) {
    const { pageNum, pageSize, sorted, filtered } = pagination;
    const where: Prisma.platform_quota_orderWhereInput = {};

    for (const f of filtered || []) {
      if (f.id === 'status' && f.value !== '' && f.value != null) {
        where.status = Number(f.value);
      }
      if (f.id === 'order_type' && f.value) {
        where.order_type = String(f.value);
      }
      if (f.id === 'phone' && f.value) {
        where.phone = { contains: String(f.value) };
      }
    }

    const orderBy: Prisma.platform_quota_orderOrderByWithRelationInput[] = [];
    for (const s of sorted || []) {
      if (s.id === 'create_date') {
        orderBy.push({ create_date: s.desc ? 'desc' : 'asc' });
      }
    }
    if (!orderBy.length) {
      orderBy.push({ create_date: 'desc' });
    }

    const [rows, data] = await Promise.all([
      this.prisma.platform_quota_order.count({ where }),
      this.prisma.platform_quota_order.findMany({
        where,
        orderBy,
        skip: pageNum * pageSize,
        take: pageSize,
      }),
    ]);

    const orderIds = data
      .filter((o) => o.status === PLATFORM_ORDER_STATUS.CONFIRMED)
      .map((o) => o.order_id);
    const codes =
      orderIds.length > 0
        ? await this.prisma.platform_activation_code.findMany({
            where: { order_id: { in: orderIds } },
          })
        : [];
    const codeMap = new Map(codes.map((c) => [c.order_id, c]));

    const usedStoreIds = Array.from(
      new Set(
        codes.map((c) => c.used_store_id).filter((id): id is string => !!id),
      ),
    );
    const stores =
      usedStoreIds.length > 0
        ? await this.prisma.store.findMany({
            where: { store_id: { in: usedStoreIds } },
            select: { store_id: true, store_name: true },
          })
        : [];
    const storeNameMap = new Map(stores.map((s) => [s.store_id, s.store_name]));

    return {
      data: data.map((o) => {
        const activationCode = codeMap.get(o.order_id) || null;
        return {
          ...o,
          activationCode: activationCode
            ? {
                ...activationCode,
                used_store_name: activationCode.used_store_id
                  ? storeNameMap.get(activationCode.used_store_id) || null
                  : null,
              }
            : null,
        };
      }),
      rows,
      pages: Math.ceil(rows / pageSize),
    };
  }

  async getPendingOrderCount() {
    const count = await this.prisma.platform_quota_order.count({
      where: { status: PLATFORM_ORDER_STATUS.PENDING },
    });
    return { count };
  }

  async confirmOrder(orderId: string, admin: UserEntity) {
    const order = await this.prisma.platform_quota_order.findUnique({
      where: { order_id: orderId },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== PLATFORM_ORDER_STATUS.PENDING) {
      throw new BadRequestException('订单状态不可确认');
    }

    const existingCode = await this.prisma.platform_activation_code.findFirst({
      where: { order_id: orderId },
    });
    if (existingCode) {
      throw new BadRequestException('该订单已发码');
    }

    const code = await this.createUniqueCode();
    const codeType =
      order.order_type === PLATFORM_ORDER_TYPE.STORE_CREATE
        ? PLATFORM_ORDER_TYPE.STORE_CREATE
        : PLATFORM_ORDER_TYPE.MEMBER_QUOTA;

    const [updatedOrder, activationCode] = await this.prisma.$transaction([
      this.prisma.platform_quota_order.update({
        where: { order_id: orderId },
        data: {
          status: PLATFORM_ORDER_STATUS.CONFIRMED,
          confirm_date: new Date(),
          confirm_user_id: admin.user_id,
        },
      }),
      this.prisma.platform_activation_code.create({
        data: {
          code,
          order_id: orderId,
          code_type: codeType,
          bound_phone: order.phone,
          user_id: order.user_id,
          store_id: order.store_id,
          quota_amount: order.quota_amount,
          status: PLATFORM_CODE_STATUS.UNUSED,
        },
      }),
    ]);

    return { order: updatedOrder, activationCode };
  }

  async cancelOrder(orderId: string) {
    const order = await this.prisma.platform_quota_order.findUnique({
      where: { order_id: orderId },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== PLATFORM_ORDER_STATUS.PENDING) {
      throw new BadRequestException('仅待处理订单可取消');
    }

    return this.prisma.platform_quota_order.update({
      where: { order_id: orderId },
      data: { status: PLATFORM_ORDER_STATUS.CANCELLED },
    });
  }

  async validateCode(user: UserEntity, dto: ValidateCodeDto) {
    const phone = this.assertBoundPhone(user);
    const code = String(dto.code || '')
      .trim()
      .toUpperCase();

    const record = await this.prisma.platform_activation_code.findUnique({
      where: { code },
    });

    if (!record) {
      throw new BadRequestException('验证码无效');
    }
    if (record.status === PLATFORM_CODE_STATUS.USED) {
      throw new BadRequestException('验证码已使用');
    }
    if (record.code_type !== dto.code_type) {
      throw new BadRequestException('验证码类型不匹配');
    }
    if (record.bound_phone !== phone) {
      throw new BadRequestException('验证码与当前绑定手机号不匹配');
    }
    if (
      dto.code_type === PLATFORM_ORDER_TYPE.MEMBER_QUOTA &&
      dto.store_id &&
      record.store_id &&
      record.store_id !== dto.store_id
    ) {
      throw new BadRequestException('验证码不适用于当前门店');
    }

    return {
      valid: true,
      code_type: record.code_type,
      quota_amount: record.quota_amount,
    };
  }

  async redeemStoreCreateCode(
    user: UserEntity,
    code: string,
    storeId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const phone = this.assertBoundPhone(user);
    const normalized = String(code || '')
      .trim()
      .toUpperCase();
    const db = tx || this.prisma;

    const record = await db.platform_activation_code.findUnique({
      where: { code: normalized },
    });

    if (!record) {
      throw new BadRequestException('验证码无效');
    }
    if (record.status === PLATFORM_CODE_STATUS.USED) {
      throw new BadRequestException('验证码已使用');
    }
    if (record.code_type !== PLATFORM_ORDER_TYPE.STORE_CREATE) {
      throw new BadRequestException('验证码类型不匹配');
    }
    if (record.bound_phone !== phone) {
      throw new BadRequestException('验证码与当前绑定手机号不匹配');
    }

    await db.platform_activation_code.update({
      where: { code: normalized },
      data: {
        status: PLATFORM_CODE_STATUS.USED,
        used_date: new Date(),
        used_store_id: storeId,
      },
    });

    return record;
  }

  async redeemMemberQuotaCode(user: UserEntity, code: string, storeId: string) {
    const phone = this.assertBoundPhone(user);
    const normalized = String(code || '')
      .trim()
      .toUpperCase();

    const store = await this.prisma.store.findUnique({
      where: { store_id: storeId },
    });
    if (!store) {
      throw new NotFoundException('店铺不存在');
    }

    const record = await this.prisma.platform_activation_code.findUnique({
      where: { code: normalized },
    });

    if (!record) {
      throw new BadRequestException('验证码无效');
    }
    if (record.status === PLATFORM_CODE_STATUS.USED) {
      throw new BadRequestException('验证码已使用');
    }
    if (record.code_type !== PLATFORM_ORDER_TYPE.MEMBER_QUOTA) {
      throw new BadRequestException('验证码类型不匹配');
    }
    if (record.bound_phone !== phone) {
      throw new BadRequestException('验证码与当前绑定手机号不匹配');
    }
    if (record.store_id && record.store_id !== storeId) {
      throw new BadRequestException('验证码不适用于当前门店');
    }

    const quotaAmount = record.quota_amount || 0;
    if (!quotaAmount) {
      throw new BadRequestException('验证码数据异常');
    }

    await this.prisma.$transaction([
      this.prisma.platform_activation_code.update({
        where: { code: normalized },
        data: {
          status: PLATFORM_CODE_STATUS.USED,
          used_date: new Date(),
          used_store_id: storeId,
        },
      }),
      this.prisma.store.update({
        where: { store_id: storeId },
        data: {
          extra_member_limit: (store.extra_member_limit || 0) + quotaAmount,
        },
      }),
    ]);

    return this.getMemberQuotaInfo(storeId);
  }

  async assertStoreCreateAllowed(user: UserEntity, activationCode?: string) {
    const check = await this.getStoreQuotaCheck(user);
    if (!check.needsCode) {
      return;
    }
    if (!activationCode?.trim()) {
      throw new BadRequestException('创建第2个及以后门店需要验证码');
    }
    await this.validateCode(user, {
      code: activationCode,
      code_type: PLATFORM_ORDER_TYPE.STORE_CREATE,
    });
  }

  async paginationCodes(pagination: Pagination) {
    const { pageNum, pageSize, sorted, filtered } = pagination;
    const where: Prisma.platform_activation_codeWhereInput = {};

    for (const f of filtered || []) {
      if (f.id === 'status' && f.value !== '' && f.value != null) {
        where.status = Number(f.value);
      }
      if (f.id === 'code_type' && f.value) {
        where.code_type = String(f.value);
      }
      if (f.id === 'bound_phone' && f.value) {
        where.bound_phone = { contains: String(f.value) };
      }
      if (f.id === 'code' && f.value) {
        where.code = { contains: String(f.value).toUpperCase() };
      }
    }

    const orderBy: Prisma.platform_activation_codeOrderByWithRelationInput[] =
      [];
    for (const s of sorted || []) {
      if (s.id === 'create_date') {
        orderBy.push({ create_date: s.desc ? 'desc' : 'asc' });
      }
    }
    if (!orderBy.length) {
      orderBy.push({ create_date: 'desc' });
    }

    const [rows, data] = await Promise.all([
      this.prisma.platform_activation_code.count({ where }),
      this.prisma.platform_activation_code.findMany({
        where,
        orderBy,
        skip: pageNum * pageSize,
        take: pageSize,
      }),
    ]);

    return { data, rows, pages: Math.ceil(rows / pageSize) };
  }

  async getDutyUserIds(): Promise<string[]> {
    const setting = await this.prisma.platform_setting.findUnique({
      where: { setting_key: PLATFORM_SETTING_KEYS.DUTY_USER_IDS },
    });
    if (!setting?.setting_value) return [];
    return setting.setting_value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async updateDutyUserIds(userIds: string[]) {
    const value = userIds.join(',');
    await this.prisma.platform_setting.upsert({
      where: { setting_key: PLATFORM_SETTING_KEYS.DUTY_USER_IDS },
      create: {
        setting_key: PLATFORM_SETTING_KEYS.DUTY_USER_IDS,
        setting_value: value,
      },
      update: {
        setting_value: value,
        update_date: new Date(),
      },
    });
    return { user_ids: userIds };
  }
}
