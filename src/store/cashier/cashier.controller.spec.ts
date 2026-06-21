import { Test, TestingModule } from '@nestjs/testing';
import { CashierController } from './cashier.controller';
import { CashierService } from './cashier.service';

describe('CashierController', () => {
  let controller: CashierController;
  let service: CashierService;

  beforeEach(async () => {
    const mockCashierService = {
      getSyncData: jest.fn(),
      pushOrder: jest.fn(),
      getTodayOrders: jest.fn(),
      getTodaySalesByGoods: jest.fn(),
      getOrders: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashierController],
      providers: [{ provide: CashierService, useValue: mockCashierService }],
    }).compile();

    controller = module.get<CashierController>(CashierController);
    service = module.get<CashierService>(CashierService);
  });

  describe('getSyncData', () => {
    it('should call service getSyncData', async () => {
      const storeId = 's1';
      await controller.getSyncData(storeId);
      expect(service.getSyncData).toHaveBeenCalledWith(storeId);
    });
  });

  describe('pushOrders', () => {
    it('should call service pushOrder', async () => {
      const dto = { store_id: 's1', order: {} };
      await controller.pushOrders(dto as any);
      expect(service.pushOrder).toHaveBeenCalledWith(dto);
    });
  });

  describe('getOrders', () => {
    it('should call service getOrders', async () => {
      const storeId = 's1';
      await controller.getOrders(storeId, '2', '20', '138');
      expect(service.getOrders).toHaveBeenCalledWith(storeId, 2, 20, {
        phone: '138',
      });
    });
  });

  describe('getTodaySalesByGoods', () => {
    it('should call service getTodaySalesByGoods', async () => {
      const storeId = 's1';
      await controller.getTodaySalesByGoods(storeId);
      expect(service.getTodaySalesByGoods).toHaveBeenCalledWith(storeId);
    });
  });

  describe('getOrders', () => {
    it('should call service getOrders', async () => {
      const storeId = 's1';
      await controller.getOrders(storeId, '2', '20', '138');
      expect(service.getOrders).toHaveBeenCalledWith(storeId, 2, 20, {
        phone: '138',
      });
    });
  });
});
