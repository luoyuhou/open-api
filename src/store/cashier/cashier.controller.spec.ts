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
});
