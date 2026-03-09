import { Test, TestingModule } from '@nestjs/testing';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { Request } from 'express';
import { UserEntity } from '../users/entities/user.entity';
import { CreateStoreInputDto } from './dto/create-store.dto';
import { Pagination } from '../common/dto/pagination';
import { SearchStoreDto } from './dto/search-store.dto';
import { SearchHistoryDto } from './dto/search-history.dto';
import { ApproverStoreDto } from './dto/approver-store.dto';
import { STORE_STATUS_TYPES } from './const';

describe('StoreController', () => {
  let controller: StoreController;
  let storeService: jest.Mocked<StoreService>;

  beforeEach(async () => {
    const mockStoreService = {
      create: jest.fn(),
      pagination: jest.fn(),
      findHistory: jest.fn(),
      searchMany: jest.fn(),
      findAllApprovedStoresBySessionUser: jest.fn(),
      findOne: jest.fn(),
      updatePaymentQrs: jest.fn(),
      adapter: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [{ provide: StoreService, useValue: mockStoreService }],
    }).compile();

    controller = module.get<StoreController>(StoreController);
    storeService = module.get(StoreService) as jest.Mocked<StoreService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create store', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: CreateStoreInputDto = {
        store_name: 'Store',
        id_code: 'id_code',
        id_name: 'id_name',
        phone: 'phone',
        province: '123',
        city: '456',
        town: '678',
        area: '789',
        address: 'Address',
      };
      const mockStore = { store_id: 'store123', ...dto };
      storeService.create.mockResolvedValue(mockStore as any);

      const result = await controller.create(mockRequest, dto);

      expect(storeService.create).toHaveBeenCalledWith(mockUser, dto);
      expect(result).toEqual(mockStore);
    });
  });

  describe('applyList', () => {
    it('should return paginated apply list for user', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      storeService.pagination.mockResolvedValue(mockResult as any);

      const result = await controller.applyList(mockRequest, pagination);

      expect(storeService.pagination).toHaveBeenCalledWith(pagination);
      expect(result).toEqual(mockResult);
    });
  });

  describe('pagination', () => {
    it('should return paginated stores', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      storeService.pagination.mockResolvedValue(mockResult as any);

      const result = await controller.pagination(pagination);

      expect(storeService.pagination).toHaveBeenCalledWith(pagination);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findHistory', () => {
    it('should return store history', async () => {
      const storeId = 'store123';
      const query: SearchHistoryDto = { type: 'update' };
      const mockHistory = [{ event: 'update' }];
      storeService.findHistory.mockResolvedValue(mockHistory as any);

      const result = await controller.findHistory(storeId, query);

      expect(storeService.findHistory).toHaveBeenCalledWith(storeId, 'update');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('search', () => {
    it('should search stores', async () => {
      const args: SearchStoreDto = { type: 'name', value: 'value' };
      const mockStores = [{ store_id: 'store1' }];
      storeService.searchMany.mockResolvedValue(mockStores as any);

      const result = await controller.search(args);

      expect(storeService.searchMany).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockStores);
    });
  });

  describe('findAllApprovedStoresBySessionUser', () => {
    it('should return approved stores for session user', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const mockStores = [{ store_id: 'store1' }];
      storeService.findAllApprovedStoresBySessionUser.mockResolvedValue(
        mockStores as any,
      );

      const result = await controller.findAllApprovedStoresBySessionUser(
        mockRequest,
      );

      expect(
        storeService.findAllApprovedStoresBySessionUser,
      ).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ data: mockStores });
    });
  });

  describe('findOne', () => {
    it('should return store by id', async () => {
      const storeId = 'store123';
      const mockStore = { store_id: storeId, name: 'Store' };
      storeService.findOne.mockResolvedValue(mockStore as any);

      const result = await controller.findOne(storeId);

      expect(storeService.findOne).toHaveBeenCalledWith(storeId);
      expect(result).toEqual(mockStore);
    });
  });

  describe('updatePaymentQrs', () => {
    it('should update payment QR codes', async () => {
      const storeId = 'store123';
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const body = { wechat_qr_url: 'wechat.png', alipay_qr_url: 'alipay.png' };
      const mockStore = { store_id: storeId, ...body };
      storeService.updatePaymentQrs.mockResolvedValue(mockStore as any);

      const result = await controller.updatePaymentQrs(
        storeId,
        body,
        mockRequest,
      );

      expect(storeService.updatePaymentQrs).toHaveBeenCalledWith(
        storeId,
        body,
        mockUser,
      );
      expect(result).toEqual(mockStore);
    });
  });

  describe('adapter', () => {
    it('should approve store', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const args: ApproverStoreDto = {
        store_id: 'store123',
        status: STORE_STATUS_TYPES.REVIEWED,
      };
      const mockResult = { store_id: 'store123', status: 'approved' };
      storeService.adapter.mockResolvedValue(mockResult as any);

      const result = await controller.adapter(args, mockRequest);

      expect(storeService.adapter).toHaveBeenCalledWith(args, mockUser);
      expect(result).toEqual(mockResult);
    });
  });
});
