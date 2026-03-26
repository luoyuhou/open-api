import { Test, TestingModule } from '@nestjs/testing';
import {
  PlatformSettlementService,
  E_PLATFORM_SETTLEMENT_TYPE,
} from './platform-settlement.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PlatformSettlementService', () => {
  let service: PlatformSettlementService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      platform_settlement: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      store_service_payment: {
        findMany: jest.fn(),
      },
      store_resource_order: {
        findMany: jest.fn(),
      },
      store_order_service_fee: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformSettlementService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PlatformSettlementService>(PlatformSettlementService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateMonthlySettlement', () => {
    it('should skip if settlement already exists', async () => {
      const existingSettlement = { settlement_id: 'p1', month: '2024-01' };
      prisma.platform_settlement.findUnique.mockResolvedValue(
        existingSettlement,
      );

      const result = await service.generateMonthlySettlement('2024-01');

      expect(result.skipped).toBe(true);
      expect(result.settlement).toEqual(existingSettlement);
    });

    it('should create new platform settlement with all fee types', async () => {
      const mockSettlement = {
        settlement_id: 'p1',
        month: '2024-01',
        total_subscription_fee: 10000,
        total_resource_fee: 5000,
        total_order_service_fee: 3000,
        total_amount: 18000,
      };

      prisma.platform_settlement.findUnique.mockResolvedValue(null);
      prisma.store_service_payment.findMany.mockResolvedValue([
        {
          id: 1,
          amount: 10000,
          invoice_id: 'inv1',
          invoice: { subscription: { store_id: 'store1' } },
        },
      ]);
      prisma.store_resource_order.findMany.mockResolvedValue([
        { order_id: 'ro1', store_id: 'store1', price: 5000 },
      ]);
      prisma.$queryRaw.mockResolvedValue([
        {
          store_id: 'store1',
          order_date: new Date('2024-01-15'),
          order_count: 15,
        },
      ]);
      prisma.store_order_service_fee.findFirst.mockResolvedValue(null);
      prisma.store_order_service_fee.create.mockResolvedValue({});
      prisma.platform_settlement.create.mockResolvedValue(mockSettlement);

      const result = await service.generateMonthlySettlement('2024-01');

      expect(result.skipped).toBe(false);
      expect(result.settlement.total_amount).toBe(18000);
    });
  });

  describe('listSettlements', () => {
    it('should return settlements list with pagination', async () => {
      const mockList = [
        { settlement_id: 'p1', month: '2024-01', status: 0 },
        { settlement_id: 'p2', month: '2024-02', status: 1 },
      ];
      prisma.platform_settlement.findMany.mockResolvedValue(mockList);
      prisma.platform_settlement.count.mockResolvedValue(2);

      const result = await service.listSettlements({ page: 1, pageSize: 10 });

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should filter by status', async () => {
      prisma.platform_settlement.findMany.mockResolvedValue([]);
      prisma.platform_settlement.count.mockResolvedValue(0);

      await service.listSettlements({ status: 1, page: 1, pageSize: 10 });

      expect(prisma.platform_settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 1 },
        }),
      );
    });

    it('should filter by month', async () => {
      prisma.platform_settlement.findMany.mockResolvedValue([]);
      prisma.platform_settlement.count.mockResolvedValue(0);

      await service.listSettlements({
        month: '2024-01',
        page: 1,
        pageSize: 10,
      });

      expect(prisma.platform_settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { month: '2024-01' },
        }),
      );
    });
  });

  describe('getSettlementDetail', () => {
    it('should return settlement detail with summary grouped by type', async () => {
      const mockSettlement = {
        settlement_id: 'p1',
        month: '2024-01',
        details: [
          {
            type: E_PLATFORM_SETTLEMENT_TYPE.subscription,
            amount: 10000,
            store_id: 'store1',
          },
          {
            type: E_PLATFORM_SETTLEMENT_TYPE.resource,
            amount: 5000,
            store_id: 'store1',
          },
          {
            type: E_PLATFORM_SETTLEMENT_TYPE.order_service,
            amount: 3000,
            store_id: 'store1',
          },
        ],
      };

      prisma.platform_settlement.findUnique.mockResolvedValue(mockSettlement);

      const result = await service.getSettlementDetail('p1');

      expect(result.summary.subscription).toHaveLength(1);
      expect(result.summary.resource).toHaveLength(1);
      expect(result.summary.orderService).toHaveLength(1);
    });

    it('should throw error if settlement not found', async () => {
      prisma.platform_settlement.findUnique.mockResolvedValue(null);

      await expect(service.getSettlementDetail('nonexistent')).rejects.toThrow(
        '结算记录不存在',
      );
    });
  });

  describe('confirmSettlement', () => {
    it('should update settlement status to 1', async () => {
      const mockResult = { settlement_id: 'p1', status: 1 };
      prisma.platform_settlement.update.mockResolvedValue(mockResult);

      const result = await service.confirmSettlement('p1');

      expect(prisma.platform_settlement.update).toHaveBeenCalledWith({
        where: { settlement_id: 'p1' },
        data: { status: 1 },
      });
      expect(result.status).toBe(1);
    });
  });

  describe('settleSettlement', () => {
    it('should update settlement status to 2 and set settled_at', async () => {
      const mockResult = {
        settlement_id: 'p1',
        status: 2,
        settled_at: new Date(),
      };
      prisma.platform_settlement.update.mockResolvedValue(mockResult);

      const result = await service.settleSettlement('p1');

      expect(prisma.platform_settlement.update).toHaveBeenCalledWith({
        where: { settlement_id: 'p1' },
        data: { status: 2, settled_at: expect.any(Date) },
      });
      expect(result.status).toBe(2);
    });
  });

  describe('getPlatformSettlementStats', () => {
    it('should return platform settlement statistics', async () => {
      const mockSettlements = [
        {
          settlement_id: 'p1',
          total_amount: 18000,
          total_subscription_fee: 10000,
          total_resource_fee: 5000,
          total_order_service_fee: 3000,
        },
        {
          settlement_id: 'p2',
          total_amount: 20000,
          total_subscription_fee: 12000,
          total_resource_fee: 5000,
          total_order_service_fee: 3000,
        },
      ];
      prisma.platform_settlement.findMany.mockResolvedValue(mockSettlements);

      const result = await service.getPlatformSettlementStats();

      expect(result.totalAmount).toBe(38000);
      expect(result.totalSubscriptionFee).toBe(22000);
      expect(result.totalResourceFee).toBe(10000);
      expect(result.totalOrderServiceFee).toBe(6000);
      expect(result.recentSettlements).toHaveLength(2);
    });
  });
});
