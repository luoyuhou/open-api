import { Test, TestingModule } from '@nestjs/testing';
import { StoreResourceService } from './store-resource.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache-manager/cache.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('StoreResourceService', () => {
  let service: StoreResourceService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreResourceService,
        PrismaService,
        {
          provide: CacheService,
          useValue: {
            getUsedQuota: jest.fn(),
            setUsedQuota: jest.fn(),
            invalidateUsedQuota: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StoreResourceService>(StoreResourceService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsedQuota', () => {
    it('should return cached quota when available', async () => {
      const store_id = 'store123';
      const cachedQuota = 1024 * 1024; // 1MB

      jest.spyOn(cacheService, 'getUsedQuota').mockResolvedValue(cachedQuota);

      const result = await service.getUsedQuota(store_id);

      expect(result).toBe(cachedQuota);
      expect(cacheService.getUsedQuota).toHaveBeenCalledWith(store_id);
    });

    it('should calculate and cache quota when not in cache', async () => {
      const store_id = 'store123';
      const calculatedQuota = 2 * 1024 * 1024; // 2MB

      jest.spyOn(cacheService, 'getUsedQuota').mockResolvedValue(null);
      jest
        .spyOn(prismaService.store_goods, 'findMany')
        .mockResolvedValue([
          { goods_id: 'goods1' },
          { goods_id: 'goods2' },
        ] as any);
      jest
        .spyOn(prismaService.store_goods_version, 'findMany')
        .mockResolvedValue([
          { image_hash: 'hash1' },
          { image_hash: 'hash2' },
        ] as any);
      jest
        .spyOn(prismaService.file, 'findMany')
        .mockResolvedValue([
          { size: 1024 * 1024 },
          { size: 1024 * 1024 },
        ] as any);
      jest.spyOn(cacheService, 'setUsedQuota').mockResolvedValue();

      const result = await service.getUsedQuota(store_id);

      expect(result).toBe(calculatedQuota);
      expect(cacheService.setUsedQuota).toHaveBeenCalledWith(
        store_id,
        calculatedQuota,
      );
    });

    it('should return 0 when store has no goods', async () => {
      const store_id = 'store123';

      jest.spyOn(cacheService, 'getUsedQuota').mockResolvedValue(null);
      jest.spyOn(prismaService.store_goods, 'findMany').mockResolvedValue([]);

      const result = await service.getUsedQuota(store_id);

      expect(result).toBe(0);
    });
  });

  describe('invalidateUsedQuota', () => {
    it('should invalidate cache', async () => {
      const store_id = 'store123';

      jest.spyOn(cacheService, 'invalidateUsedQuota').mockResolvedValue();

      await service.invalidateUsedQuota(store_id);

      expect(cacheService.invalidateUsedQuota).toHaveBeenCalledWith(store_id);
    });
  });

  describe('getStoreResource', () => {
    it('should return store resource', async () => {
      const store_id = 'store123';
      const mockResource = {
        id: 1,
        store_id,
        total_quota: BigInt(10 * 1024 * 1024),
      };

      jest
        .spyOn(prismaService.store_resource, 'findUnique')
        .mockResolvedValue(mockResource as any);

      const result = await service.getStoreResource(store_id);

      expect(result).toEqual(mockResource);
    });
  });

  describe('createQuotaOrder', () => {
    it('should create quota order', async () => {
      const payload = {
        store_id: 'store123',
        quota_amount: 10 * 1024 * 1024,
        price: 100,
      };
      const mockOrder = {
        order_id: 'RO-uuid',
        store_id: payload.store_id,
        quota_amount: BigInt(payload.quota_amount),
        price: payload.price,
        status: 0,
      };

      jest
        .spyOn(prismaService.store_resource_order, 'create')
        .mockResolvedValue(mockOrder as any);

      const result = await service.createQuotaOrder(payload);

      expect(result.store_id).toBe(payload.store_id);
    });
  });

  describe('approveOrder', () => {
    it('should approve order and increase quota', async () => {
      const orderId = 1;
      const mockOrder = {
        id: orderId,
        store_id: 'store123',
        quota_amount: BigInt(10 * 1024 * 1024),
        status: 0,
      };
      const mockResource = {
        store_id: 'store123',
        total_quota: BigInt(10 * 1024 * 1024),
      };

      jest
        .spyOn(prismaService.store_resource_order, 'findUnique')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(prismaService.store_resource_order, 'update')
        .mockResolvedValue(mockOrder as any);
      jest
        .spyOn(prismaService.store_resource, 'findUnique')
        .mockResolvedValue(mockResource as any);
      jest.spyOn(prismaService.store_resource, 'update').mockResolvedValue({
        ...mockResource,
        total_quota: BigInt(20 * 1024 * 1024),
      } as any);

      const result = await service.approveOrder(orderId);

      expect(result.total_quota).toBe(BigInt(20 * 1024 * 1024));
    });

    it('should throw NotFoundException for non-existing order', async () => {
      const orderId = 999;

      jest
        .spyOn(prismaService.store_resource_order, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.approveOrder(orderId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for already approved order', async () => {
      const orderId = 1;
      const mockOrder = {
        id: orderId,
        store_id: 'store123',
        quota_amount: BigInt(10 * 1024 * 1024),
        status: 1, // already approved
      };

      jest
        .spyOn(prismaService.store_resource_order, 'findUnique')
        .mockResolvedValue(mockOrder as any);

      await expect(service.approveOrder(orderId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listStoreOrders', () => {
    it('should return list of store orders', async () => {
      const store_id = 'store123';
      const mockOrders = [
        { order_id: 'RO-1', store_id, quota_amount: BigInt(1024), status: 1 },
        { order_id: 'RO-2', store_id, quota_amount: BigInt(2048), status: 0 },
      ];

      jest
        .spyOn(prismaService.store_resource_order, 'findMany')
        .mockResolvedValue(mockOrders as any);

      const result = await service.listStoreOrders(store_id);

      expect(result).toHaveLength(2);
    });
  });
});
