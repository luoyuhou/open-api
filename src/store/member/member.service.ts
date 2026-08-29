import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateRechargeDto } from './dto/create-recharge.dto';
import { RefundMemberBalanceDto } from './dto/refund-member-balance.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 } from 'uuid';
import Utils from '../../common/utils';
import { PlatformService } from '../../platform/platform.service';
import { UserEntity } from '../../users/entities/user.entity';

@Injectable()
export class MemberService {
  constructor(
    private prisma: PrismaService,
    private platformService: PlatformService,
  ) {}

  async create(createMemberDto: CreateMemberDto) {
    const { store_id, phone } = createMemberDto;

    const existingMember = await (this.prisma as any).store_member.findFirst({
      where: { store_id, phone },
    });

    if (existingMember) {
      if (existingMember.status === 1) {
        throw new BadRequestException('该手机号已注册为会员');
      } else {
        await this.platformService.assertCanAddMember(store_id);
        return (this.prisma as any).store_member.update({
          where: { id: existingMember.id },
          data: {
            ...createMemberDto,
            status: 1,
            update_date: new Date(),
          },
        });
      }
    }

    await this.platformService.assertCanAddMember(store_id);

    const memberId = `member-${v4()}`;

    return (this.prisma as any).store_member.create({
      data: {
        ...createMemberDto,
        member_id: memberId,
      },
    });
  }

  async findAll(store_id: string, query?: string) {
    return (this.prisma as any).store_member.findMany({
      where: {
        store_id,
        status: 1,
        OR: query
          ? [{ name: { contains: query } }, { phone: { contains: query } }]
          : undefined,
      },
      orderBy: { create_date: 'desc' },
    });
  }

  async findOne(id: string) {
    const member = await (this.prisma as any).store_member.findUnique({
      where: { member_id: id },
    });
    if (!member) {
      throw new BadRequestException('会员不存在');
    }
    return member;
  }

  async findByPhone(store_id: string, phone: string) {
    return (this.prisma as any).store_member.findFirst({
      where: { store_id, phone, status: 1 },
    });
  }

  async update(id: string, updateMemberDto: UpdateMemberDto) {
    const member = await (this.prisma as any).store_member.findUnique({
      where: { member_id: id },
    });

    if (!member) {
      throw new BadRequestException('会员不存在');
    }

    return (this.prisma as any).store_member.update({
      where: { id: member.id },
      data: {
        ...updateMemberDto,
        update_date: new Date(),
      },
    });
  }

  async remove(id: string) {
    const member = await (this.prisma as any).store_member.findUnique({
      where: { member_id: id },
    });

    if (!member) {
      throw new BadRequestException('会员不存在');
    }

    return (this.prisma as any).store_member.update({
      where: { id: member.id },
      data: { status: 0, update_date: new Date() },
    });
  }

  async recharge(dto: CreateRechargeDto) {
    const { member_id, received_amount } = dto;

    const member = await (this.prisma as any).store_member.findUnique({
      where: { member_id },
    });

    if (!member) {
      throw new BadRequestException('会员不存在');
    }

    return this.prisma.$transaction(async (tx) => {
      await (tx as any).store_member.update({
        where: { id: member.id },
        data: {
          balance: { increment: received_amount },
          update_date: new Date(),
        },
      });

      return (tx as any).store_recharge.create({
        data: {
          recharge_id: `recharge-${v4()}`,
          ...dto,
        },
      });
    });
  }

  /**
   * 会员账户退费：扣减余额退还给顾客；积分可清空。
   * 仅门店所有者可操作。amount 单位为元。
   */
  async refundBalance(
    memberId: string,
    user: UserEntity,
    { amount, clear_points }: RefundMemberBalanceDto,
  ) {
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new BadRequestException('退费金额无效');
    }

    const member = await (this.prisma as any).store_member.findUnique({
      where: { member_id: memberId },
    });
    if (!member || member.status !== 1) {
      throw new BadRequestException('会员不存在');
    }

    const store = await this.prisma.store.findUnique({
      where: { store_id: member.store_id },
    });
    if (!store || store.user_id !== user.user_id) {
      throw new ForbiddenException('仅门店所有者可操作会员退费');
    }

    if ((member.balance || 0) < amountCents) {
      throw new BadRequestException(
        `退费金额不能超过账户余额 ¥${((member.balance || 0) / 100).toFixed(2)}`,
      );
    }

    const shouldClearPoints = !!clear_points;

    return this.prisma.$transaction(async (tx) => {
      const updated = await (tx as any).store_member.update({
        where: { id: member.id },
        data: {
          balance: { decrement: amountCents },
          ...(shouldClearPoints ? { points: 0 } : {}),
          update_date: new Date(),
        },
      });

      const record = await (tx as any).store_recharge.create({
        data: {
          recharge_id: `refund-${v4()}`,
          member_id: memberId,
          store_id: member.store_id,
          amount: -amountCents,
          received_amount: -amountCents,
          cashier_name: user.first_name
            ? `${user.first_name}${user.last_name || ''}`
            : '店主',
          remark: shouldClearPoints
            ? `账户退费￥${(amountCents / 100).toFixed(2)}（已清积分）`
            : `账户退费￥${(amountCents / 100).toFixed(2)}`,
        },
      });

      return {
        memberId,
        refundAmount: amountCents / 100,
        balance: updated.balance / 100,
        points: updated.points,
        clearPoints: shouldClearPoints,
        recordId: record.recharge_id,
      };
    });
  }

  async findRecharges(store_id: string, member_id?: string) {
    return (this.prisma as any).store_recharge.findMany({
      where: {
        store_id,
        member_id: member_id || undefined,
      },
      orderBy: { create_date: 'desc' },
    });
  }

  async findMemberOrders(member_id: string) {
    const orders = await this.prisma.user_order.findMany({
      where: {
        user_id: member_id,
        status: 1, // 已完成
      },
      orderBy: { create_date: 'desc' },
    });

    return orders.map((o) => {
      const originalAmount = (o.original_amount || o.money) / 100;
      const totalDiscountAmount = (o.discount_amount || 0) / 100;
      const discountRate = o.discount_rate ?? 100;
      const manualDiscountAmount =
        discountRate < 100 ? (originalAmount * (100 - discountRate)) / 100 : 0;
      const pointsDiscountAmount = Math.max(
        0,
        totalDiscountAmount - manualDiscountAmount,
      );

      return {
        id: o.order_id,
        memberId: o.user_id,
        totalAmount: originalAmount.toFixed(2),
        payableAmount: (o.money / 100).toFixed(2),
        discountAmount: totalDiscountAmount.toFixed(2),
        manualDiscountAmount: manualDiscountAmount.toFixed(2),
        pointsDiscountAmount: pointsDiscountAmount.toFixed(2),
        discountRate:
          discountRate < 100 ? (discountRate / 10).toFixed(1) : null,
        pointsUsed: o.points_used || 0,
        pointsEarn: o.points_earn || 0,
        createdAt: o.create_date,
        paymentMethod: o.payment_method,
        status: 'completed',
      };
    });
  }

  /** 当前用户在各店的会员身份（按绑定手机号匹配） */
  async findMyMemberships(phone?: string | null) {
    if (!Utils.isRealMobilePhone(phone)) {
      return { needBindPhone: true, list: [] };
    }

    const normalizedPhone = String(phone).trim();
    const members = await (this.prisma as any).store_member.findMany({
      where: { phone: normalizedPhone, status: 1 },
      orderBy: { create_date: 'desc' },
    });

    if (members.length === 0) {
      return { needBindPhone: false, list: [] };
    }

    const storeIds = [
      ...new Set(members.map((m: { store_id: string }) => m.store_id)),
    ] as string[];
    const stores = await this.prisma.store.findMany({
      where: { store_id: { in: storeIds } },
      select: { store_id: true, store_name: true },
    });
    const storeMap = new Map(stores.map((s) => [s.store_id, s.store_name]));

    return {
      needBindPhone: false,
      list: members.map((m: any) => ({
        memberId: m.member_id,
        storeId: m.store_id,
        storeName: storeMap.get(m.store_id) || '未知门店',
        memberName: m.name,
        balance: Number((m.balance / 100).toFixed(2)),
        points: m.points || 0,
      })),
    };
  }

  /** 我的某店会员详情：摘要 + 消费 + 充值（校验手机号归属） */
  async findMyMembershipDetail(memberId: string, phone?: string | null) {
    if (!Utils.isRealMobilePhone(phone)) {
      throw new ForbiddenException('请先绑定手机号');
    }

    const member = await (this.prisma as any).store_member.findUnique({
      where: { member_id: memberId },
    });
    if (!member || member.status !== 1) {
      throw new BadRequestException('会员不存在');
    }
    if (String(member.phone).trim() !== String(phone).trim()) {
      throw new ForbiddenException('无权查看该会员信息');
    }

    const store = await this.prisma.store.findUnique({
      where: { store_id: member.store_id },
      select: { store_id: true, store_name: true },
    });

    const [orders, rechargesRaw] = await Promise.all([
      this.findMemberOrders(memberId),
      this.findRecharges(member.store_id, memberId),
    ]);

    const recharges = (rechargesRaw || []).map((r: any) => ({
      id: r.recharge_id,
      amount: Number((r.amount / 100).toFixed(2)),
      receivedAmount: Number((r.received_amount / 100).toFixed(2)),
      cashierName: r.cashier_name || '',
      remark: r.remark || '',
      createdAt: r.create_date,
    }));

    return {
      member: {
        memberId: member.member_id,
        storeId: member.store_id,
        storeName: store?.store_name || '未知门店',
        memberName: member.name,
        phone: member.phone,
        balance: Number((member.balance / 100).toFixed(2)),
        points: member.points || 0,
      },
      orders,
      recharges,
    };
  }
}
