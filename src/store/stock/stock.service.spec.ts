import { Test, TestingModule } from '@nestjs/testing';
import { StockService } from './stock.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StockService', () => {
  let service: StockService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      store_goods: {
        findMany: jest.fn(),
      },
      store_goods_version: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStockWarningList', () => {
    it('should return warning list for low stock items', async () => {
      const storeId = 'store123';
      const mockGoods = [
        { goods_id: 'g1', name: 'Product A' },
        { goods_id: 'g2', name: 'Product B' },
      ];
      const mockVersions = [
        {
          version_id: 'v1',
          goods_id: 'g1',
          version_number: 'V1',
          unit_name: '个',
          count: 2,
          stock_warning: 10,
          price: 100,
          status: 1,
        },
        {
          version_id: 'v2',
          goods_id: 'g2',
          version_number: 'V2',
          unit_name: '箱',
          count: 0,
          stock_warning: 5,
          price: 200,
          status: 1,
        },
        {
          version_id: 'v3',
          goods_id: 'g1',
          version_number: 'V3',
          unit_name: '个',
          count: 100,
          stock_warning: 10,
          price: 150,
          status: 1,
        },
      ];

      prisma.store_goods.findMany.mockResolvedValue(mockGoods);
      prisma.store_goods_version.findMany.mockResolvedValue(mockVersions);

      const result = await service.getStockWarningList(storeId);

      expect(result).toHaveLength(2);
      expect(result[0].goods_name).toBe('Product A');
      expect(result[0].warning_level).toBe('high');
      expect(result[1].warning_level).toBe('critical');
    });
  });

  describe('updateStock', () => {
    it('should add stock count', async () => {
      const dto = { versionId: 'v1', count: 50, operateType: 'add' as const };
      const mockVersion = {
        version_id: 'v1',
        count: 100,
      };

      prisma.store_goods_version.findUnique.mockResolvedValue(mockVersion);
      prisma.store_goods_version.update.mockResolvedValue({});

      const result = await service.updateStock(dto, {
        user_id: 'user1',
      } as any);

      expect(result.oldCount).toBe(100);
      expect(result.newCount).toBe(150);
    });

    it('should subtract stock count', async () => {
      const dto = {
        versionId: 'v1',
        count: 30,
        operateType: 'subtract' as const,
      };
      const mockVersion = {
        version_id: 'v1',
        count: 100,
      };

      prisma.store_goods_version.findUnique.mockResolvedValue(mockVersion);
      prisma.store_goods_version.update.mockResolvedValue({});

      const result = await service.updateStock(dto, {
        user_id: 'user1',
      } as any);

      expect(result.newCount).toBe(70);
    });

    it('should set stock count', async () => {
      const dto = { versionId: 'v1', count: 200, operateType: 'set' as const };
      const mockVersion = {
        version_id: 'v1',
        count: 100,
      };

      prisma.store_goods_version.findUnique.mockResolvedValue(mockVersion);
      prisma.store_goods_version.update.mockResolvedValue({});

      const result = await service.updateStock(dto, {
        user_id: 'user1',
      } as any);

      expect(result.newCount).toBe(200);
    });

    it('should throw error if version not found', async () => {
      const dto = { versionId: 'v1', count: 50, operateType: 'add' as const };

      prisma.store_goods_version.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStock(dto, { user_id: 'user1' } as any),
      ).rejects.toThrow('商品版本不存在');
    });
  });

  describe('updateWarningThreshold', () => {
    it('should update threshold', async () => {
      prisma.store_goods_version.update.mockResolvedValue({});

      await service.updateWarningThreshold('v1', 20, {
        user_id: 'user1',
      } as any);

      expect(prisma.store_goods_version.update).toHaveBeenCalledWith({
        where: { version_id: 'v1' },
        data: {
          stock_warning: 20,
          update_date: expect.any(Date),
        },
      });
    });
  });
});
