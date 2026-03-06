import { Test, TestingModule } from '@nestjs/testing';
import { StoreOrderService } from './store.order.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../../order/order.service';
import { Pagination } from '../../common/dto/pagination';
import { E_USER_ORDER_STAGE, E_USER_ORDER_STATUS } from '../../order/const';
import { EUSER_AUTH_STATUS } from '../../auth/role-management/const';

describe('StoreOrderService', () => {
  let service: StoreOrderService;
  let prismaService: any;
  let orderService: any;

  beforeEach(async () => {
    const mockPrismaService = {
      store: {
        findMany: jest.fn(),
      },
      province: {
        findMany: jest.fn(),
      },
      user_order: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user_auth: {
        findFirst: jest.fn(),
      },
      report_store_daily_order: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      report_platform_daily_order: {
        groupBy: jest.fn(),
      },
      report_store_daily_goods: {
        findMany: jest.fn(),
      },
      store_goods_version: {
        findMany: jest.fn(),
      },
      user_order_action: {
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    const mockOrderService = {
      findAll: jest.fn(),
      orderDetail: jest.fn(),
      accept: jest.fn(),
      delivery: jest.fn(),
      confirmPayment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreOrderService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OrderService, useValue: mockOrderService },
      ],
    }).compile();

    service = module.get<StoreOrderService>(StoreOrderService);
    prismaService = module.get(PrismaService);
    orderService = module.get(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('pagination', () => {
    it('should return empty result when user has no stores', async () => {
      prismaService.store.findMany.mockResolvedValue([]);
      const pagination = new Pagination();
      const result = await service.pagination('user123', pagination);
      expect(result).toEqual({ rows: 0, pages: 0, data: [] });
      expect(prismaService.store.findMany).toHaveBeenCalledWith({
        where: { user_id: 'user123' },
      });
    });

    it('should return formatted data when user has stores', async () => {
      const mockStores = [
        { store_id: 'store1', store_name: 'Store 1' },
        { store_id: 'store2', store_name: 'Store 2' },
      ];
      prismaService.store.findMany.mockResolvedValue(mockStores);
      const mockOrders = [
        {
          order_id: 'order1',
          store_id: 'store1',
          province: '110000',
          city: '110100',
          area: '110101',
          town: '001',
          money: 1000,
          create_date: new Date(),
        },
      ];
      orderService.findAll.mockResolvedValue({
        rows: 1,
        pages: 1,
        data: mockOrders,
      });
      const mockProvinces = [
        { code: '110000', name: 'Beijing', town: '0' },
        { code: '110100', name: 'Beijing City', town: '0' },
        { code: '110101', name: 'Dongcheng District', town: '0' },
        { code: '110101', name: 'Some Town', town: '001' },
      ];
      prismaService.province.findMany.mockResolvedValue(mockProvinces);

      const pagination = new Pagination();
      const result = await service.pagination('user123', pagination);
      expect(result.rows).toBe(1);
      expect(result.pages).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].province).toBe('Beijing');
      expect(result.data[0].city).toBe('Beijing City');
      expect(result.data[0].area).toBe('Dongcheng District');
    });
  });

  describe('getStatistics', () => {
    it('should return zero statistics when user has no stores', async () => {
      prismaService.store.findMany.mockResolvedValue([]);
      const result = await service.getStatistics('user123');
      expect(result).toEqual({
        pending: 0,
        stocking: 0,
        shipping: 0,
        finished: 0,
        total: 0,
        totalAmount: 0,
        today: {
          total: 0,
          totalAmount: 0,
        },
        byStore: [],
      });
    });

    it('should calculate statistics correctly', async () => {
      const mockStores = [{ store_id: 'store1', store_name: 'Store 1' }];
      prismaService.store.findMany.mockResolvedValue(mockStores);
      prismaService.user_order.count.mockImplementation(async (args) => {
        if (args?.where?.stage === E_USER_ORDER_STAGE.create) return 5;
        if (args?.where?.stage === E_USER_ORDER_STAGE.accept) return 3;
        if (args?.where?.stage === E_USER_ORDER_STAGE.delivery) return 2;
        if (args?.where?.stage?.in?.includes(E_USER_ORDER_STAGE.received))
          return 10;
        if (args?.where?.status === E_USER_ORDER_STATUS.active) return 20;
        return 0;
      });
      const mockOrders = [
        { money: 1000, store_id: 'store1', create_date: new Date() },
        {
          money: 2000,
          store_id: 'store1',
          create_date: new Date(Date.now() - 86400000),
        },
      ];
      prismaService.user_order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getStatistics('user123');
      expect(result.pending).toBe(5);
      expect(result.stocking).toBe(3);
      expect(result.shipping).toBe(2);
      expect(result.finished).toBe(10);
      expect(result.total).toBe(20);
      expect(result.totalAmount).toBe(3000);
      expect(result.byStore).toHaveLength(1);
      expect(result.byStore[0].storeId).toBe('store1');
    });
  });

  describe('getTrend', () => {
    it('should return empty points when user has no stores', async () => {
      prismaService.store.findMany.mockResolvedValue([]);
      const result = await service.getTrend('user123', 7);
      expect(result).toEqual({ days: 7, points: [] });
    });

    it('should aggregate daily trend data', async () => {
      const mockStores = [{ store_id: 'store1' }];
      prismaService.store.findMany.mockResolvedValue(mockStores);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().slice(0, 10);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const mockOrders = [
        { create_date: today, money: 1000 },
        { create_date: today, money: 2000 },
        { create_date: yesterday, money: 1500 },
      ];
      prismaService.user_order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getTrend('user123', 3);
      expect(result.days).toBe(3);
      expect(result.points).toHaveLength(3);
      const point1 = result.points.find((p) => p.date === todayStr);
      expect(point1?.total).toBe(2);
      expect(point1?.totalAmount).toBe(3000);
      const point2 = result.points.find((p) => p.date === yesterdayStr);
      expect(point2?.total).toBe(1);
      expect(point2?.totalAmount).toBe(1500);
    });
  });

  describe('getMonthlyTrendForAllStores', () => {
    it('should throw ForbiddenException when user is not admin', async () => {
      prismaService.user_auth.findFirst.mockResolvedValue(null);
      await expect(
        service.getMonthlyTrendForAllStores('user123'),
      ).rejects.toThrow('仅后台管理者可查看系统订单趋势');
    });

    it('should query platform trend when storeId not provided', async () => {
      prismaService.user_auth.findFirst.mockResolvedValue({
        is_admin: true,
        status: EUSER_AUTH_STATUS.active,
      });
      prismaService.report_platform_daily_order.groupBy.mockResolvedValue([]);
      const result = await service.getMonthlyTrendForAllStores('admin123');
      expect(
        prismaService.report_platform_daily_order.groupBy,
      ).toHaveBeenCalled();
      expect(result.month).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should query store trend when storeId provided', async () => {
      prismaService.user_auth.findFirst.mockResolvedValue({
        is_admin: true,
        status: EUSER_AUTH_STATUS.active,
      });
      prismaService.report_store_daily_order.groupBy.mockResolvedValue([]);
      const result = await service.getMonthlyTrendForAllStores(
        'admin123',
        '2025-01',
        'store1',
      );
      expect(prismaService.report_store_daily_order.groupBy).toHaveBeenCalled();
      expect(result.month).toBe('2025-01');
    });
  });
});
