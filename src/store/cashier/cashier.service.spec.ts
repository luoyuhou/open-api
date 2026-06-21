import { Test, TestingModule } from '@nestjs/testing';
import { CashierService } from './cashier.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CashierService', () => {
  let service: CashierService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashierService,
        {
          provide: PrismaService,
          useValue: {
            category_goods: {
              findMany: jest.fn(),
            },
            store_goods: {
              findMany: jest.fn(),
            },
            store_goods_version: {
              findMany: jest.fn(),
            },
            user_order: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
            user_order_info: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            store_member: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
            $executeRawUnsafe: jest.fn(),
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CashierService>(CashierService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getSyncData', () => {
    it('应该返回适配小程序本地DB格式的商品和分类数据', async () => {
      (prisma.category_goods.findMany as jest.Mock).mockResolvedValue([
        { category_id: 'cat1', name: '分类1' },
      ]);
      (prisma.store_goods.findMany as jest.Mock).mockResolvedValue([
        { goods_id: 'g1', name: '商品1', category_id: 'cat1' },
      ]);
      (prisma.store_goods_version.findMany as jest.Mock).mockResolvedValue([
        { goods_id: 'g1', version_id: 'v1', price: 1000, unit_name: '件' },
      ]);

      const result = await service.getSyncData('s1');

      expect(result.categories[0].id).toBe('cat1');
      expect(result.products[0].id).toBe('g1');
      expect(result.products[0].price).toBe(10); // 分转元
      expect(result.products[0].categoryIds).toContain('cat1');
    });
  });

  describe('getOrders', () => {
    it('无手机号匹配时应返回空列表', async () => {
      (prisma.store_member.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getOrders('s1', 1, 10, { phone: '999' });

      expect(result).toEqual([]);
      expect(prisma.user_order.findMany).not.toHaveBeenCalled();
    });

    it('应按会员手机号筛选并格式化订单', async () => {
      (prisma.store_member.findMany as jest.Mock)
        .mockResolvedValueOnce([{ member_id: 'm1' }])
        .mockResolvedValueOnce([
          { member_id: 'm1', name: '张三', phone: '13800138000' },
        ]);
      (prisma.user_order.findMany as jest.Mock).mockResolvedValue([
        {
          order_id: 'o1',
          user_id: 'm1',
          original_amount: 1000,
          money: 1000,
          discount_amount: 0,
          discount_rate: 100,
          points_used: 0,
          points_earn: 0,
          create_date: new Date('2026-06-01T10:00:00Z'),
          payment_method: 'CASHIER_OFFLINE',
        },
      ]);
      (prisma.user_order_info.findMany as jest.Mock).mockResolvedValue([
        {
          order_id: 'o1',
          goods_id: 'g1',
          goods_name: '商品1',
          goods_version_id: 'v1',
          count: 2,
          price: 500,
        },
      ]);
      (prisma.store_goods_version.findMany as jest.Mock).mockResolvedValue([
        { version_id: 'v1', unit_name: '件' },
      ]);

      const result = await service.getOrders('s1', 1, 10, { phone: '138' });

      expect(prisma.store_member.findMany).toHaveBeenCalledWith({
        where: { store_id: 's1', phone: { contains: '138' } },
        select: { member_id: true },
      });
      expect(prisma.user_order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: { in: ['m1'] },
          }),
        }),
      );
      expect(result[0].memberPhone).toBe('13800138000');
      expect(result[0].items[0].quantity).toBe(2);
    });
  });

  describe('getTodaySalesByGoods', () => {
    it('应该按商品汇总今日销量', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { goods_id: 'g1', quantity: 3 },
        { goods_id: 'g2', quantity: BigInt(5) },
      ]);

      const result = await service.getTodaySalesByGoods('s1');

      expect(result.sales).toEqual({ g1: 3, g2: 5 });
    });

    it('无订单时应返回空汇总', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.getTodaySalesByGoods('s1');

      expect(result.sales).toEqual({});
    });
  });

  describe('pushOrder', () => {
    it('应该处理会员支付并更新余额和积分', async () => {
      const dto = {
        store_id: 's1',
        order: {
          local_id: 'l1',
          member_id: 'm1',
          total_amount: 1000,
          payable_amount: 1000,
          payment_method: 'balance',
          created_at: new Date().toISOString(),
          items: [
            {
              goods_id: 'g1',
              version_id: 'v1',
              count: 1,
              name: '商品1',
              price: 1000,
            },
          ],
        },
      };

      (prisma as any).store_member.findUnique.mockResolvedValue({
        member_id: 'm1',
        balance: 2000,
      });
      (prisma as any).store_member.update.mockResolvedValue({});
      (prisma.user_order.create as jest.Mock).mockResolvedValue({
        order_id: 'o1',
      });

      const result = await service.pushOrder(dto);

      expect(result[0].status).toBe('success');
      expect((prisma as any).store_member.update).toHaveBeenCalled();
    });

    it('如果余额不足应该返回错误信息', async () => {
      const dto = {
        store_id: 's1',
        order: {
          member_id: 'm1',
          total_amount: 5000,
          payment_method: 'balance',
          created_at: new Date().toISOString(),
        },
      } as any;

      (prisma as any).store_member.findUnique.mockResolvedValue({
        member_id: 'm1',
        balance: 1000,
      });

      const result = await service.pushOrder(dto);
      expect(result[0].status).toBe('error');
      expect(result[0].message).toContain('余额不足');
    });
  });
});
