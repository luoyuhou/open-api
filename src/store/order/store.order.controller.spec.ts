import { Test, TestingModule } from '@nestjs/testing';
import { StoreOrderController } from './store.order.controller';
import { StoreOrderService } from './store.order.service';
import { Request } from 'express';
import { UserEntity } from '../../users/entities/user.entity';
import { Pagination } from '../../common/dto/pagination';

describe('StoreOrderController', () => {
  let controller: StoreOrderController;
  let storeOrderService: any;

  beforeEach(async () => {
    const mockStoreOrderService = {
      pagination: jest.fn(),
      orderDetail: jest.fn(),
      getOrderHistory: jest.fn(),
      acceptOrder: jest.fn(),
      shipOrder: jest.fn(),
      confirmPayment: jest.fn(),
      getStatistics: jest.fn(),
      getTrend: jest.fn(),
      getMetrics: jest.fn(),
      getDailyReport: jest.fn(),
      getMonthlyTrendForAllStores: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreOrderController],
      providers: [
        { provide: StoreOrderService, useValue: mockStoreOrderService },
      ],
    }).compile();

    controller = module.get<StoreOrderController>(StoreOrderController);
    storeOrderService = module.get(StoreOrderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('pagination', () => {
    it('should call service with user ID and pagination', async () => {
      const mockReq = { user: { user_id: 'user123' } } as unknown as Request;
      const pagination = new Pagination();
      storeOrderService.pagination.mockResolvedValue({
        rows: 1,
        pages: 1,
        data: [],
      });
      await controller.pagination(mockReq, pagination);
      expect(storeOrderService.pagination).toHaveBeenCalledWith(
        'user123',
        pagination,
      );
    });
  });

  describe('findOne', () => {
    it('should call orderDetail with order ID', async () => {
      storeOrderService.orderDetail.mockResolvedValue({} as any);
      await controller.findOne('order123');
      expect(storeOrderService.orderDetail).toHaveBeenCalledWith('order123');
    });
  });

  describe('getOrderHistory', () => {
    it('should call getOrderHistory with order ID', async () => {
      storeOrderService.getOrderHistory.mockResolvedValue({} as any);
      await controller.getOrderHistory('order123');
      expect(storeOrderService.getOrderHistory).toHaveBeenCalledWith(
        'order123',
      );
    });
  });

  describe('acceptOrder', () => {
    it('should call acceptOrder with user and order ID', async () => {
      const mockReq = { user: { user_id: 'user123' } } as unknown as Request;
      storeOrderService.acceptOrder.mockResolvedValue({} as any);
      await controller.acceptOrder(mockReq, { order_id: 'order123' });
      expect(storeOrderService.acceptOrder).toHaveBeenCalledWith(
        { user_id: 'user123' } as UserEntity,
        'order123',
      );
    });
  });

  describe('shipOrder', () => {
    it('should call shipOrder with user and order ID', async () => {
      const mockReq = { user: { user_id: 'user123' } } as unknown as Request;
      storeOrderService.shipOrder.mockResolvedValue({} as any);
      await controller.shipOrder(mockReq, { order_id: 'order123' });
      expect(storeOrderService.shipOrder).toHaveBeenCalledWith(
        { user_id: 'user123' } as UserEntity,
        'order123',
      );
    });
  });

  describe('confirmPayment', () => {
    it('should call confirmPayment with user and order ID', async () => {
      const mockReq = { user: { user_id: 'user123' } } as unknown as Request;
      storeOrderService.confirmPayment.mockResolvedValue({} as any);
      await controller.confirmPayment(mockReq, { order_id: 'order123' });
      expect(storeOrderService.confirmPayment).toHaveBeenCalledWith(
        { user_id: 'user123' } as UserEntity,
        'order123',
      );
    });
  });

  describe('statistics', () => {
    it('should call getStatistics with user ID', async () => {
      const mockReq = { user: { user_id: 'user123' } } as unknown as Request;
      storeOrderService.getStatistics.mockResolvedValue({} as any);
      await controller.statistics(mockReq);
      expect(storeOrderService.getStatistics).toHaveBeenCalledWith('user123');
    });
  });

  describe('trend', () => {
    it('should call getTrend with user ID and default days', async () => {
      const mockReq = { user: { user_id: 'user123' } } as unknown as Request;
      storeOrderService.getTrend.mockResolvedValue({} as any);
      await controller.trend(mockReq, {});
      expect(storeOrderService.getTrend).toHaveBeenCalledWith('user123', 10);
    });

    it('should call getTrend with specified days', async () => {
      const mockReq = { user: { user_id: 'user123' } } as unknown as Request;
      storeOrderService.getTrend.mockResolvedValue({} as any);
      await controller.trend(mockReq, { days: 7 });
      expect(storeOrderService.getTrend).toHaveBeenCalledWith('user123', 7);
    });
  });

  describe('metrics', () => {
    it('should call getMetrics with user ID and default days', async () => {
      const mockReq = { user: { user_id: 'user123' } } as unknown as Request;
      storeOrderService.getMetrics.mockResolvedValue({} as any);
      await controller.metrics(mockReq, {});
      expect(storeOrderService.getMetrics).toHaveBeenCalledWith('user123', 30);
    });

    it('should call getMetrics with specified days', async () => {
      const mockReq = { user: { user_id: 'user123' } } as unknown as Request;
      storeOrderService.getMetrics.mockResolvedValue({} as any);
      await controller.metrics(mockReq, { days: 15 });
      expect(storeOrderService.getMetrics).toHaveBeenCalledWith('user123', 15);
    });
  });

  describe('dailyReport', () => {
    it('should call getDailyReport with user ID and optional recordDate', async () => {
      const mockReq = { user: { user_id: 'user123' } } as unknown as Request;
      storeOrderService.getDailyReport.mockResolvedValue({} as any);
      await controller.dailyReport(mockReq, { recordDate: '2025-01-01' });
      expect(storeOrderService.getDailyReport).toHaveBeenCalledWith(
        'user123',
        '2025-01-01',
      );
    });
  });

  describe('adminMonthlyTrend', () => {
    it('should call getMonthlyTrendForAllStores with user ID and optional month and store_id', async () => {
      const mockReq = { user: { user_id: 'admin123' } } as unknown as Request;
      storeOrderService.getMonthlyTrendForAllStores.mockResolvedValue(
        {} as any,
      );
      await controller.adminMonthlyTrend(mockReq, {
        month: '2025-01',
        store_id: 'store1',
      });
      expect(
        storeOrderService.getMonthlyTrendForAllStores,
      ).toHaveBeenCalledWith('admin123', '2025-01', 'store1');
    });
  });
});
