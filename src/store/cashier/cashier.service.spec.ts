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
            },
            store_member: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
            $executeRawUnsafe: jest.fn(),
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
