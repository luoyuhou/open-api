import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateRechargeDto } from './dto/create-recharge.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 } from 'uuid';

@Injectable()
export class MemberService {
  constructor(private prisma: PrismaService) {}

  async create(createMemberDto: CreateMemberDto) {
    const { store_id, phone } = createMemberDto;

    const existingMember = await (this.prisma as any).store_member.findFirst({
      where: { store_id, phone },
    });

    if (existingMember) {
      if (existingMember.status === 1) {
        throw new BadRequestException('该手机号已注册为会员');
      } else {
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

    return orders.map((o) => ({
      id: o.order_id,
      memberId: o.user_id,
      totalAmount: (o.money / 100).toFixed(2),
      createdAt: o.create_date,
      paymentMethod: o.payment_method,
      status: 'completed',
    }));
  }
}
