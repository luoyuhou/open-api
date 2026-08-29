import { Test, TestingModule } from '@nestjs/testing';
import { MemberService } from './member.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformService } from '../../platform/platform.service';
import { BadRequestException } from '@nestjs/common';

const mockPlatformService = {
  assertCanAddMember: jest.fn().mockResolvedValue(undefined),
};

describe('MemberService', () => {
  let service: MemberService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberService,
        {
          provide: PrismaService,
          useValue: {
            store_member: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            store_recharge: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
            user_order: {
              findMany: jest.fn(),
            },
            store: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
          },
        },
        { provide: PlatformService, useValue: mockPlatformService },
      ],
    }).compile();

    service = module.get<MemberService>(MemberService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('应该创建新会员，如果手机号未注册', async () => {
      const dto = { store_id: 's1', phone: '13800000000', name: '张三' };
      (prisma as any).store_member.findFirst.mockResolvedValue(null);
      (prisma as any).store_member.create.mockResolvedValue({
        member_id: 'm1',
        ...dto,
      });

      const result = await service.create(dto);
      expect((prisma as any).store_member.create).toHaveBeenCalled();
      expect(result.member_id).toBeDefined();
    });

    it('应该抛出错误，如果会员已存在且状态正常', async () => {
      const dto = { store_id: 's1', phone: '13800000000', name: '张三' };
      ((prisma as any).store_member.findFirst as jest.Mock).mockResolvedValue({
        status: 1,
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('recharge', () => {
    it('应该增加会员余额并创建充值记录', async () => {
      const dto = {
        member_id: 'm1',
        store_id: 's1',
        amount: 1000,
        received_amount: 1100,
      };
      (prisma as any).store_member.findUnique.mockResolvedValue({
        id: 1,
        member_id: 'm1',
        balance: 0,
      });
      (prisma as any).store_member.update.mockResolvedValue({});
      (prisma as any).store_recharge.create.mockResolvedValue({
        recharge_id: 'r1',
      });

      const result = await service.recharge(dto);
      expect((prisma as any).store_member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ balance: { increment: 1100 } }),
        }),
      );
      expect(result.recharge_id).toBeDefined();
    });
  });

  describe('findMemberOrders', () => {
    it('应该返回格式化后的订单列表', async () => {
      (prisma.user_order.findMany as jest.Mock).mockResolvedValue([
        {
          order_id: 'o1',
          user_id: 'm1',
          money: 10000,
          create_date: new Date(),
          payment_method: 'balance',
          points_used: 50,
          points_earn: 10,
        },
      ]);

      const result = await service.findMemberOrders('m1');
      expect(result[0].totalAmount).toBe('100.00');
      expect(result[0].pointsUsed).toBe(50);
      expect(result[0].pointsEarn).toBe(10);
      expect(result[0].status).toBe('completed');
    });
  });

  describe('findMyMemberships', () => {
    it('未绑定手机号时返回 needBindPhone', async () => {
      const result = await service.findMyMemberships('tmp123');
      expect(result.needBindPhone).toBe(true);
      expect(result.list).toEqual([]);
    });

    it('应返回各店会员列表', async () => {
      (prisma as any).store_member.findMany.mockResolvedValue([
        {
          member_id: 'm1',
          store_id: 's1',
          name: '张三',
          balance: 10000,
          points: 200,
        },
      ]);
      (prisma.store.findMany as jest.Mock).mockResolvedValue([
        { store_id: 's1', store_name: '测试店' },
      ]);

      const result = await service.findMyMemberships('13800000000');
      expect(result.needBindPhone).toBe(false);
      expect(result.list).toHaveLength(1);
      expect(result.list[0].storeName).toBe('测试店');
      expect(result.list[0].balance).toBe(100);
    });
  });

  describe('refundBalance', () => {
    const owner = {
      user_id: 'owner-1',
      first_name: '店',
      last_name: '主',
    } as any;

    it('应从会员余额扣减退费金额', async () => {
      (prisma.store_member.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        member_id: 'm1',
        store_id: 's1',
        status: 1,
        balance: 5000,
        points: 80,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        store_id: 's1',
        user_id: 'owner-1',
      });
      (prisma.store_member.update as jest.Mock).mockResolvedValue({
        balance: 2000,
        points: 80,
      });
      (prisma.store_recharge.create as jest.Mock).mockResolvedValue({
        recharge_id: 'refund-1',
      });

      const result = await service.refundBalance('m1', owner, {
        amount: 30,
        clear_points: false,
      });

      expect(prisma.store_member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            balance: { decrement: 3000 },
          }),
        }),
      );
      expect(result.refundAmount).toBe(30);
      expect(result.clearPoints).toBe(false);
    });

    it('勾选清理积分时应将积分清零', async () => {
      (prisma.store_member.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        member_id: 'm1',
        store_id: 's1',
        status: 1,
        balance: 1000,
        points: 80,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        store_id: 's1',
        user_id: 'owner-1',
      });
      (prisma.store_member.update as jest.Mock).mockResolvedValue({
        balance: 0,
        points: 0,
      });
      (prisma.store_recharge.create as jest.Mock).mockResolvedValue({
        recharge_id: 'refund-2',
      });

      await service.refundBalance('m1', owner, {
        amount: 10,
        clear_points: true,
      });

      expect(prisma.store_member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            balance: { decrement: 1000 },
            points: 0,
          }),
        }),
      );
    });

    it('非店主不可退费', async () => {
      (prisma.store_member.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        member_id: 'm1',
        store_id: 's1',
        status: 1,
        balance: 1000,
      });
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        store_id: 's1',
        user_id: 'owner-1',
      });

      await expect(
        service.refundBalance('m1', { user_id: 'other' } as any, { amount: 1 }),
      ).rejects.toThrow('仅门店所有者可操作会员退费');
    });
  });
});
