import { Test, TestingModule } from '@nestjs/testing';
import { SettlementController } from './settlement.controller';
import { StoreSettlementService } from './store-settlement.service';
import { PlatformSettlementService } from './platform-settlement.service';

describe('SettlementController', () => {
  let controller: SettlementController;
  let storeSettlementService: jest.Mocked<StoreSettlementService>;
  let platformSettlementService: jest.Mocked<PlatformSettlementService>;

  beforeEach(async () => {
    const mockStoreSettlementService = {
      generateMonthlySettlement: jest.fn(),
      listSettlements: jest.fn(),
      getSettlementDetail: jest.fn(),
      confirmSettlement: jest.fn(),
      settleSettlement: jest.fn(),
      getStoreSettlementStats: jest.fn(),
    };

    const mockPlatformSettlementService = {
      generateMonthlySettlement: jest.fn(),
      listSettlements: jest.fn(),
      getSettlementDetail: jest.fn(),
      confirmSettlement: jest.fn(),
      settleSettlement: jest.fn(),
      getPlatformSettlementStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettlementController],
      providers: [
        {
          provide: StoreSettlementService,
          useValue: mockStoreSettlementService,
        },
        {
          provide: PlatformSettlementService,
          useValue: mockPlatformSettlementService,
        },
      ],
    }).compile();

    controller = module.get<SettlementController>(SettlementController);
    storeSettlementService = module.get(
      StoreSettlementService,
    ) as jest.Mocked<StoreSettlementService>;
    platformSettlementService = module.get(
      PlatformSettlementService,
    ) as jest.Mocked<PlatformSettlementService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ========== 商家结算测试 ==========

  describe('generateStoreSettlement', () => {
    it('should generate store monthly settlement without params', async () => {
      const mockResult = [
        {
          store_id: 'store1',
          settlement: { settlement_id: 's1' },
          skipped: false,
        },
      ];
      storeSettlementService.generateMonthlySettlement.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.generateStoreSettlement({});

      expect(
        storeSettlementService.generateMonthlySettlement,
      ).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual({ data: mockResult });
    });

    it('should generate store monthly settlement with storeId and month', async () => {
      const mockResult = [
        {
          store_id: 'store1',
          settlement: { settlement_id: 's1' },
          skipped: false,
        },
      ];
      storeSettlementService.generateMonthlySettlement.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.generateStoreSettlement({
        storeId: 'store1',
        month: '2024-01',
      });

      expect(
        storeSettlementService.generateMonthlySettlement,
      ).toHaveBeenCalledWith('store1', '2024-01');
      expect(result).toEqual({ data: mockResult });
    });
  });

  describe('listStoreSettlements', () => {
    it('should return store settlements list with default params', async () => {
      const mockResult = { list: [], total: 0, page: 1, pageSize: 20 };
      storeSettlementService.listSettlements.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.listStoreSettlements();

      expect(storeSettlementService.listSettlements).toHaveBeenCalledWith({
        storeId: undefined,
        month: undefined,
        status: undefined,
        page: 1,
        pageSize: 20,
      });
      expect(result).toEqual({ data: mockResult });
    });

    it('should return store settlements list with filter params', async () => {
      const mockResult = {
        list: [{ settlement_id: 's1' }],
        total: 1,
        page: 2,
        pageSize: 10,
      };
      storeSettlementService.listSettlements.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.listStoreSettlements(
        'store1',
        '2024-01',
        '0',
        '2',
        '10',
      );

      expect(storeSettlementService.listSettlements).toHaveBeenCalledWith({
        storeId: 'store1',
        month: '2024-01',
        status: 0,
        page: 2,
        pageSize: 10,
      });
      expect(result).toEqual({ data: mockResult });
    });
  });

  describe('getStoreSettlementDetail', () => {
    it('should return store settlement detail', async () => {
      const mockDetail = {
        settlement_id: 's1',
        store_id: 'store1',
        details: [],
      };
      storeSettlementService.getSettlementDetail.mockResolvedValue(
        mockDetail as any,
      );

      const result = await controller.getStoreSettlementDetail('s1');

      expect(storeSettlementService.getSettlementDetail).toHaveBeenCalledWith(
        's1',
      );
      expect(result).toEqual({ data: mockDetail });
    });
  });

  describe('confirmStoreSettlement', () => {
    it('should confirm store settlement', async () => {
      const mockResult = { settlement_id: 's1', status: 1 };
      storeSettlementService.confirmSettlement.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.confirmStoreSettlement('s1');

      expect(storeSettlementService.confirmSettlement).toHaveBeenCalledWith(
        's1',
      );
      expect(result).toEqual({ data: mockResult });
    });
  });

  describe('settleStoreSettlement', () => {
    it('should settle store settlement', async () => {
      const mockResult = { settlement_id: 's1', status: 2 };
      storeSettlementService.settleSettlement.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.settleStoreSettlement('s1');

      expect(storeSettlementService.settleSettlement).toHaveBeenCalledWith(
        's1',
      );
      expect(result).toEqual({ data: mockResult });
    });
  });

  describe('getStoreSettlementStats', () => {
    it('should return store settlement stats', async () => {
      const mockStats = {
        totalIncome: 10000,
        totalOrders: 100,
        pendingSettlements: 2,
      };
      storeSettlementService.getStoreSettlementStats.mockResolvedValue(
        mockStats as any,
      );

      const result = await controller.getStoreSettlementStats('store1');

      expect(
        storeSettlementService.getStoreSettlementStats,
      ).toHaveBeenCalledWith('store1');
      expect(result).toEqual({ data: mockStats });
    });
  });

  // ========== 平台结算测试 ==========

  describe('generatePlatformSettlement', () => {
    it('should generate platform monthly settlement without month', async () => {
      const mockResult = {
        settlement: { settlement_id: 'p1' },
        skipped: false,
      };
      platformSettlementService.generateMonthlySettlement.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.generatePlatformSettlement({});

      expect(
        platformSettlementService.generateMonthlySettlement,
      ).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ data: mockResult });
    });

    it('should generate platform monthly settlement with month', async () => {
      const mockResult = {
        settlement: { settlement_id: 'p1' },
        skipped: false,
      };
      platformSettlementService.generateMonthlySettlement.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.generatePlatformSettlement({
        month: '2024-01',
      });

      expect(
        platformSettlementService.generateMonthlySettlement,
      ).toHaveBeenCalledWith('2024-01');
      expect(result).toEqual({ data: mockResult });
    });
  });

  describe('listPlatformSettlements', () => {
    it('should return platform settlements list with default params', async () => {
      const mockResult = { list: [], total: 0, page: 1, pageSize: 20 };
      platformSettlementService.listSettlements.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.listPlatformSettlements();

      expect(platformSettlementService.listSettlements).toHaveBeenCalledWith({
        month: undefined,
        status: undefined,
        page: 1,
        pageSize: 20,
      });
      expect(result).toEqual({ data: mockResult });
    });

    it('should return platform settlements list with filter params', async () => {
      const mockResult = {
        list: [{ settlement_id: 'p1' }],
        total: 1,
        page: 1,
        pageSize: 10,
      };
      platformSettlementService.listSettlements.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.listPlatformSettlements(
        '2024-01',
        '1',
        '1',
        '10',
      );

      expect(platformSettlementService.listSettlements).toHaveBeenCalledWith({
        month: '2024-01',
        status: 1,
        page: 1,
        pageSize: 10,
      });
      expect(result).toEqual({ data: mockResult });
    });
  });

  describe('getPlatformSettlementDetail', () => {
    it('should return platform settlement detail', async () => {
      const mockDetail = {
        settlement_id: 'p1',
        details: [],
        summary: { subscription: [], resource: [], orderService: [] },
      };
      platformSettlementService.getSettlementDetail.mockResolvedValue(
        mockDetail as any,
      );

      const result = await controller.getPlatformSettlementDetail('p1');

      expect(
        platformSettlementService.getSettlementDetail,
      ).toHaveBeenCalledWith('p1');
      expect(result).toEqual({ data: mockDetail });
    });
  });

  describe('confirmPlatformSettlement', () => {
    it('should confirm platform settlement', async () => {
      const mockResult = { settlement_id: 'p1', status: 1 };
      platformSettlementService.confirmSettlement.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.confirmPlatformSettlement('p1');

      expect(platformSettlementService.confirmSettlement).toHaveBeenCalledWith(
        'p1',
      );
      expect(result).toEqual({ data: mockResult });
    });
  });

  describe('settlePlatformSettlement', () => {
    it('should settle platform settlement', async () => {
      const mockResult = { settlement_id: 'p1', status: 2 };
      platformSettlementService.settleSettlement.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.settlePlatformSettlement('p1');

      expect(platformSettlementService.settleSettlement).toHaveBeenCalledWith(
        'p1',
      );
      expect(result).toEqual({ data: mockResult });
    });
  });

  describe('getPlatformSettlementStats', () => {
    it('should return platform settlement stats', async () => {
      const mockStats = {
        totalAmount: 50000,
        totalSubscriptionFee: 30000,
        totalResourceFee: 10000,
        totalOrderServiceFee: 10000,
      };
      platformSettlementService.getPlatformSettlementStats.mockResolvedValue(
        mockStats as any,
      );

      const result = await controller.getPlatformSettlementStats();

      expect(
        platformSettlementService.getPlatformSettlementStats,
      ).toHaveBeenCalled();
      expect(result).toEqual({ data: mockStats });
    });
  });
});
