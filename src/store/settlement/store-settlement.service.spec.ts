import { Test, TestingModule } from '@nestjs/testing';
import { StoreSettlementService } from './store-settlement.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StoreSettlementService', () => {
  let service: StoreSettlementService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      store_settlement: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      user_order: {
        findMany: jest.fn(),
      },
      store: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreSettlementService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StoreSettlementService>(StoreSettlementService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateMonthlySettlement', () => {
    it('should skip if settlement already exists', async () => {
      const existingSettlement = {
        settlement_id: 's1',
        store_id: 'store1',
        month: '2024-01',
      };
      prisma.user_order.findMany.mockResolvedValue([{ store_id: 'store1' }]);
      prisma.store_settlement.findUnique.mockResolvedValue(existingSettlement);

      const result = await service.generateMonthlySettlement(
        undefined,
        '2024-01',
      );

      expect(result).toEqual([
        { store_id: 'store1', settlement: existingSettlement, skipped: true },
      ]);
    });

    it('should create new settlement for store', async () => {
      const mockOrders = [
        {
          order_id: 'o1',
          store_id: 'store1',
          money: 1000,
          stage: 3,
          pay_status: 1,
        },
        {
          order_id: 'o2',
          store_id: 'store1',
          money: 2000,
          stage: 4,
          pay_status: 1,
        },
      ];
      const mockSettlement = {
        settlement_id: 's1',
        store_id: 'store1',
        month: '2024-01',
        total_orders: 2,
        total_amount: 3000,
        total_income: 3000,
      };

      prisma.user_order.findMany.mockResolvedValue([{ store_id: 'store1' }]);
      prisma.store_settlement.findUnique.mockResolvedValue(null);
      prisma.user_order.findMany
        .mockResolvedValueOnce([{ store_id: 'store1' }])
        .mockResolvedValueOnce(mockOrders);
      prisma.store_settlement.create.mockResolvedValue(mockSettlement);

      const result = await service.generateMonthlySettlement(
        'store1',
        '2024-01',
      );

      expect(result[0].skipped).toBe(false);
      expect(result[0].store_id).toBe('store1');
    });
  });

  describe('listSettlements', () => {
    it('should return settlements list with pagination', async () => {
      const mockList = [
        {
          settlement_id: 's1',
          store_id: 'store1',
          month: '2024-01',
          status: 0,
        },
        {
          settlement_id: 's2',
          store_id: 'store1',
          month: '2024-02',
          status: 1,
        },
      ];
      prisma.store_settlement.findMany.mockResolvedValue(mockList);
      prisma.store_settlement.count.mockResolvedValue(2);

      const result = await service.listSettlements({
        storeId: 'store1',
        page: 1,
        pageSize: 10,
      });

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should filter by status', async () => {
      prisma.store_settlement.findMany.mockResolvedValue([]);
      prisma.store_settlement.count.mockResolvedValue(0);

      await service.listSettlements({ status: 0, page: 1, pageSize: 10 });

      expect(prisma.store_settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 0 },
        }),
      );
    });

    it('should filter by month', async () => {
      prisma.store_settlement.findMany.mockResolvedValue([]);
      prisma.store_settlement.count.mockResolvedValue(0);

      await service.listSettlements({
        month: '2024-01',
        page: 1,
        pageSize: 10,
      });

      expect(prisma.store_settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { month: '2024-01' },
        }),
      );
    });
  });

  describe('getSettlementDetail', () => {
    it('should return settlement detail with store info', async () => {
      const mockSettlement = {
        settlement_id: 's1',
        store_id: 'store1',
        month: '2024-01',
        details: [{ order_id: 'o1', amount: 1000 }],
      };
      const mockStore = { store_id: 'store1', store_name: 'Test Store' };

      prisma.store_settlement.findUnique.mockResolvedValue(mockSettlement);
      prisma.store.findUnique.mockResolvedValue(mockStore);

      const result = await service.getSettlementDetail('s1');

      expect(result.store).toEqual(mockStore);
      expect(result.details).toHaveLength(1);
    });

    it('should throw error if settlement not found', async () => {
      prisma.store_settlement.findUnique.mockResolvedValue(null);

      await expect(service.getSettlementDetail('nonexistent')).rejects.toThrow(
        '结算记录不存在',
      );
    });
  });

  describe('confirmSettlement', () => {
    it('should update settlement status to 1', async () => {
      const mockResult = { settlement_id: 's1', status: 1 };
      prisma.store_settlement.update.mockResolvedValue(mockResult);

      const result = await service.confirmSettlement('s1');

      expect(prisma.store_settlement.update).toHaveBeenCalledWith({
        where: { settlement_id: 's1' },
        data: { status: 1 },
      });
      expect(result.status).toBe(1);
    });
  });

  describe('settleSettlement', () => {
    it('should update settlement status to 2 and set settled_at', async () => {
      const mockResult = {
        settlement_id: 's1',
        status: 2,
        settled_at: new Date(),
      };
      prisma.store_settlement.update.mockResolvedValue(mockResult);

      const result = await service.settleSettlement('s1');

      expect(prisma.store_settlement.update).toHaveBeenCalledWith({
        where: { settlement_id: 's1' },
        data: { status: 2, settled_at: expect.any(Date) },
      });
      expect(result.status).toBe(2);
    });
  });

  describe('getStoreSettlementStats', () => {
    it('should return store settlement statistics', async () => {
      const mockSettlements = [
        {
          settlement_id: 's1',
          total_income: 1000,
          total_orders: 10,
          status: 0,
        },
        {
          settlement_id: 's2',
          total_income: 2000,
          total_orders: 20,
          status: 1,
        },
        {
          settlement_id: 's3',
          total_income: 3000,
          total_orders: 30,
          status: 2,
        },
      ];
      prisma.store_settlement.findMany.mockResolvedValue(mockSettlements);

      const result = await service.getStoreSettlementStats('store1');

      expect(result.totalIncome).toBe(6000);
      expect(result.totalOrders).toBe(60);
      expect(result.pendingSettlements).toBe(1);
      expect(result.recentSettlements).toHaveLength(3);
    });
  });
});
