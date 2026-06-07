import { Test, TestingModule } from '@nestjs/testing';
import { StoreOrderService } from './store.order.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../../order/order.service';
import { E_USER_ORDER_STAGE, E_USER_ORDER_STATUS } from '../../order/const';

describe('StoreOrderService', () => {
  let service: StoreOrderService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreOrderService,
        {
          provide: OrderService,
          useValue: {
            findAll: jest.fn(),
            orderDetail: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            store: {
              findMany: jest.fn(),
            },
            user_order: {
              count: jest.fn(),
              findMany: jest.fn(),
            },
            province: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<StoreOrderService>(StoreOrderService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getStatistics', () => {
    it('应该返回汇总的订单统计数据', async () => {
      const sessUserId = 'user-1';
      (prisma.store.findMany as jest.Mock).mockResolvedValue([
        { store_id: 's1', store_name: '店A' },
      ]);

      (prisma.user_order.count as jest.Mock).mockResolvedValue(5);
      (prisma.user_order.findMany as jest.Mock).mockResolvedValue([
        { store_id: 's1', money: 1000, create_date: new Date() },
      ]);

      const result = await service.getStatistics(sessUserId);

      expect(result.pending).toBe(5);
      expect(result.totalAmount).toBe(1000);
      expect(result.byStore[0].storeName).toBe('店A');
    });

    it('如果用户没有店铺，应该返回全零数据', async () => {
      (prisma.store.findMany as jest.Mock).mockResolvedValue([]);
      const result = await service.getStatistics('user-none');
      expect(result.total).toBe(0);
      expect(result.byStore).toEqual([]);
    });
  });

  describe('getMetrics', () => {
    it('应该正确计算取消率和复购率', async () => {
      (prisma.store.findMany as jest.Mock).mockResolvedValue([
        { store_id: 's1' },
      ]);
      (prisma.user_order.findMany as jest.Mock).mockResolvedValue([
        { user_id: 'u1', money: 100, status: E_USER_ORDER_STATUS.active },
        { user_id: 'u1', money: 200, status: E_USER_ORDER_STATUS.active },
        { user_id: 'u2', money: 300, status: E_USER_ORDER_STATUS.cancel },
      ]);

      const result = await service.getMetrics('user-1', 7);

      expect(result.totalOrders).toBe(3);
      expect(result.cancelRate).toBeCloseTo(1 / 3);
      expect(result.repurchaseRate).toBe(0.5); // u1复购，u2未复购。2个用户中1个复购
    });
  });
});
