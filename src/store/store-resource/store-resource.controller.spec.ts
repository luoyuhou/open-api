import { Test, TestingModule } from '@nestjs/testing';
import { StoreResourceController } from './store-resource.controller';
import { StoreResourceService } from './store-resource.service';

describe('StoreResourceController', () => {
  let controller: StoreResourceController;
  let service: StoreResourceService;

  beforeEach(async () => {
    const mockService = {
      pagination: jest.fn(),
      createQuotaOrder: jest.fn(),
      approveOrder: jest.fn(),
      getStoreResource: jest.fn(),
      getUsedQuota: jest.fn(),
      listStoreOrders: jest.fn(),
      invalidateUsedQuota: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreResourceController],
      providers: [{ provide: StoreResourceService, useValue: mockService }],
    }).compile();

    controller = module.get<StoreResourceController>(StoreResourceController);
    service = module.get<StoreResourceService>(StoreResourceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('pagination', () => {
    it('should return paginated orders', async () => {
      const pagination = {
        pageNum: 0,
        pageSize: 10,
        filtered: [],
        sorted: [],
      };
      const mockResult = {
        data: [{ id: 1, store_id: 'store1', quota_amount: BigInt(1024) }],
        rows: 1,
        pages: 1,
      };

      service.pagination = jest.fn().mockResolvedValue(mockResult);

      const result = await controller.pagination(pagination);

      expect(service.pagination).toHaveBeenCalledWith(pagination);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('applyQuota', () => {
    it('should create quota order', async () => {
      const body = {
        store_id: 'store123',
        quota_amount: 10 * 1024 * 1024,
        price: 100,
      };
      const mockOrder = {
        order_id: 'RO-uuid',
        store_id: body.store_id,
        quota_amount: BigInt(body.quota_amount),
        price: body.price,
        status: 0,
      };

      service.createQuotaOrder = jest.fn().mockResolvedValue(mockOrder);

      const result = await controller.applyQuota(body);

      expect(service.createQuotaOrder).toHaveBeenCalledWith(body);
      expect(result.data.quota_amount).toBe(Number(mockOrder.quota_amount));
    });
  });

  describe('approveOrder', () => {
    it('should approve order and return updated resource', async () => {
      const orderId = 1;
      const mockResource = {
        id: 1,
        store_id: 'store123',
        total_quota: BigInt(20 * 1024 * 1024),
      };

      service.approveOrder = jest.fn().mockResolvedValue(mockResource);

      const result = await controller.approveOrder(orderId);

      expect(service.approveOrder).toHaveBeenCalledWith(orderId);
      expect(result.data.total_quota).toBe(Number(mockResource.total_quota));
    });
  });

  describe('getInfo', () => {
    it('should return store resource info with used quota', async () => {
      const store_id = 'store123';
      const mockResource = {
        id: 1,
        store_id,
        total_quota: BigInt(10 * 1024 * 1024),
      };
      const usedQuota = 1024 * 1024; // 1MB

      service.getStoreResource = jest.fn().mockResolvedValue(mockResource);
      service.getUsedQuota = jest.fn().mockResolvedValue(usedQuota);

      const result = await controller.getInfo(store_id);

      expect(service.getStoreResource).toHaveBeenCalledWith(store_id);
      expect(service.getUsedQuota).toHaveBeenCalledWith(store_id);
      expect(result.data.total_quota).toBe(Number(mockResource.total_quota));
      expect(result.data.used_quota).toBe(usedQuota);
    });
  });

  describe('listOrders', () => {
    it('should return list of store orders', async () => {
      const store_id = 'store123';
      const mockOrders = [
        {
          order_id: 'RO-1',
          store_id,
          quota_amount: BigInt(1024),
          status: 1,
        },
        {
          order_id: 'RO-2',
          store_id,
          quota_amount: BigInt(2048),
          status: 0,
        },
      ];

      service.listStoreOrders = jest.fn().mockResolvedValue(mockOrders);

      const result = await controller.listOrders(store_id);

      expect(service.listStoreOrders).toHaveBeenCalledWith(store_id);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].quota_amount).toBe(1024);
    });
  });

  describe('getUsedQuota', () => {
    it('should return used quota for store', async () => {
      const store_id = 'store123';
      const usedQuota = 5 * 1024 * 1024; // 5MB

      service.getUsedQuota = jest.fn().mockResolvedValue(usedQuota);

      const result = await controller.getUsedQuota(store_id);

      expect(service.getUsedQuota).toHaveBeenCalledWith(store_id);
      expect(result.data.store_id).toBe(store_id);
      expect(result.data.used_quota).toBe(usedQuota);
    });
  });

  describe('invalidateQuota', () => {
    it('should invalidate used quota cache', async () => {
      const body = { store_id: 'store123' };

      service.invalidateUsedQuota = jest.fn().mockResolvedValue(undefined);

      const result = await controller.invalidateQuota(body);

      expect(service.invalidateUsedQuota).toHaveBeenCalledWith(body.store_id);
      expect(result.data.message).toBe('缓存已失效');
    });
  });
});
