import { Test, TestingModule } from '@nestjs/testing';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { Request } from 'express';
import { UserEntity } from '../../users/entities/user.entity';

describe('StockController', () => {
  let controller: StockController;
  let stockService: jest.Mocked<StockService>;

  beforeEach(async () => {
    const mockStockService = {
      getStockWarningList: jest.fn(),
      updateStock: jest.fn(),
      updateWarningThreshold: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [{ provide: StockService, useValue: mockStockService }],
    }).compile();

    controller = module.get<StockController>(StockController);
    stockService = module.get(StockService) as jest.Mocked<StockService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStockWarningList', () => {
    it('should return stock warning list for store', async () => {
      const storeId = 'store123';
      const mockWarnings = [
        {
          version_id: 'v1',
          goods_name: 'Product A',
          count: 0,
          stock_warning: 10,
        },
        {
          version_id: 'v2',
          goods_name: 'Product B',
          count: 3,
          stock_warning: 10,
        },
      ];
      stockService.getStockWarningList.mockResolvedValue(mockWarnings as any);

      const result = await controller.getStockWarningList(storeId);

      expect(stockService.getStockWarningList).toHaveBeenCalledWith(storeId);
      expect(result).toEqual({ message: 'ok', data: mockWarnings });
    });
  });

  describe('updateStock', () => {
    it('should update stock', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto = { versionId: 'v1', count: 100, operateType: 'add' as const };
      stockService.updateStock.mockResolvedValue({
        oldCount: 50,
        newCount: 150,
      });

      const result = await controller.updateStock(mockRequest, dto);

      expect(stockService.updateStock).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('updateWarningThreshold', () => {
    it('should update warning threshold', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const body = { versionId: 'v1', threshold: 20 };
      stockService.updateWarningThreshold.mockResolvedValue(undefined);

      const result = await controller.updateWarningThreshold(mockRequest, body);

      expect(stockService.updateWarningThreshold).toHaveBeenCalledWith(
        body.versionId,
        body.threshold,
        mockUser,
      );
      expect(result).toEqual({ message: 'ok' });
    });
  });
});
