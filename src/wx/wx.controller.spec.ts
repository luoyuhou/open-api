import { Test, TestingModule } from '@nestjs/testing';
import { WxController } from './wx.controller';
import { WxService } from './wx.service';
import { Request } from 'express';
import { UserEntity } from '../users/entities/user.entity';
import { CreateOrderDto } from '../order/dto/create-order.dto';
import { Pagination } from '../common/dto/pagination';
import { FindAllCategoryDto } from '../store/category/dto/findAll-category.dto';
import { UpdateAddressDto } from '../users/address/dto/update-address.dto';
import { CreateAddressDto } from '../users/address/dto/create-address.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UpdateUserPasswordDto } from '../users/dto/update-user-password.dto';
import { CreateOrderGoodsDto } from '../order/dto/create-order-goods.dto';
import { FileService } from '../file/file.service';

describe('WxController', () => {
  let controller: WxController;
  let wxService: jest.Mocked<WxService>;

  beforeEach(async () => {
    const mockWxService = {
      createOrder: jest.fn(),
      orderPagination: jest.fn(),
      orderDetailInfo: jest.fn(),
      cancelOrder: jest.fn(),
      removeOrder: jest.fn(),
      storePagination: jest.fn(),
      storeInfo: jest.fn(),
      findCategoryByStoreId: jest.fn(),
      goodsPagination: jest.fn(),
      getUserAllAddress: jest.fn(),
      findUserAddress: jest.fn(),
      editUserAddress: jest.fn(),
      createUserAddress: jest.fn(),
      updateUserProfileWithPassword: jest.fn(),
      homeBannersForMiniApp: jest.fn(),
      recommendStoresForMiniApp: jest.fn(),
      addFavoriteStore: jest.fn(),
      removeFavoriteStore: jest.fn(),
      isFavoriteStore: jest.fn(),
      listFavoriteStores: jest.fn(),
      recordStoreBrowse: jest.fn(),
      listStoreBrowseHistory: jest.fn(),
      deleteStoreBrowseHistory: jest.fn(),
    };

    const mockFileService = {
      uploadFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WxController],
      providers: [
        { provide: WxService, useValue: mockWxService },
        { provide: FileService, useValue: mockFileService },
      ],
    }).compile();

    controller = module.get<WxController>(WxController);
    wxService = module.get(WxService) as jest.Mocked<WxService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create order', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const goods: CreateOrderGoodsDto = {
        goods_id: 'goods_1',
        goods_name: 'goods_name',
        goods_version_id: 'version_1',
        count: 1,
        price: 100,
      };
      const dto: CreateOrderDto = {
        store_id: 'store123',
        goods: [goods],
        user_address_id: 'address_1',
        delivery_date: new Date(),
        payment_method: 'cod',
      };
      const mockOrder = { order_id: 'order123' };
      wxService.createOrder.mockResolvedValue(mockOrder as any);

      const result = await controller.createOrder(mockRequest, dto);

      expect(wxService.createOrder).toHaveBeenCalledWith(mockUser, dto);
      expect(result).toEqual({ message: 'ok', data: mockOrder });
    });
  });

  describe('orderPagination', () => {
    it('should return paginated orders for user', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      wxService.orderPagination.mockResolvedValue(mockResult as any);

      const result = await controller.orderPagination(mockRequest, pagination);

      expect(wxService.orderPagination).toHaveBeenCalledWith({
        ...pagination,
        filtered: pagination.filtered.concat({
          id: 'user_id',
          value: 'user123',
        }),
      });
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });

  describe('orderDetailInfo', () => {
    it('should return order detail', async () => {
      const orderId = 'order123';
      const mockDetail = { order_id: orderId };
      wxService.orderDetailInfo.mockResolvedValue(mockDetail as any);

      const result = await controller.orderDetailInfo(orderId);

      expect(wxService.orderDetailInfo).toHaveBeenCalledWith(orderId);
      expect(result).toEqual({ message: 'ok', data: mockDetail });
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const orderId = 'order123';
      wxService.cancelOrder.mockResolvedValue(undefined);

      const result = await controller.cancelOrder(mockRequest, orderId);

      expect(wxService.cancelOrder).toHaveBeenCalledWith(orderId, mockUser);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('removeOrder', () => {
    it('should remove order', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const orderId = 'order123';
      wxService.removeOrder.mockResolvedValue(undefined);

      const result = await controller.removeOrder(mockRequest, orderId);

      expect(wxService.removeOrder).toHaveBeenCalledWith(orderId, mockUser);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('storePagination', () => {
    it('should return paginated stores', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      wxService.storePagination.mockResolvedValue(mockResult as any);

      const result = await controller.storePagination(pagination);

      expect(wxService.storePagination).toHaveBeenCalledWith(pagination);
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });

  describe('storeInfo', () => {
    it('should return store info', async () => {
      const storeId = 'store123';
      const mockStore = { store_id: storeId, name: 'Store' };
      wxService.storeInfo.mockResolvedValue(mockStore as any);

      const result = await controller.storeInfo(storeId);

      expect(wxService.storeInfo).toHaveBeenCalledWith(storeId);
      expect(result).toEqual({ message: 'ok', data: mockStore });
    });
  });

  describe('findCategoryByStoreId', () => {
    it('should return categories for store', async () => {
      const storeId = 'store123';
      const query: FindAllCategoryDto = { pid: '0' };
      const mockCategories = [{ category_id: 'cat1' }];
      wxService.findCategoryByStoreId.mockResolvedValue(mockCategories as any);

      const result = await controller.findCategoryByStoreId(storeId, query);

      expect(wxService.findCategoryByStoreId).toHaveBeenCalledWith({
        store_id: storeId,
        pid: '0',
      });
      expect(result).toEqual({ message: 'ok', data: mockCategories });
    });
  });

  describe('goodsPagination', () => {
    it('should return paginated goods', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      wxService.goodsPagination.mockResolvedValue(mockResult as any);

      const result = await controller.goodsPagination(pagination);

      expect(wxService.goodsPagination).toHaveBeenCalledWith(pagination);
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });

  describe('getUserAllAddress', () => {
    it('should return all addresses for user', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const mockAddresses = [{ address_id: 'addr1' }];
      wxService.getUserAllAddress.mockResolvedValue(mockAddresses as any);

      const result = await controller.getUserAllAddress(mockRequest);

      expect(wxService.getUserAllAddress).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ message: 'ok', data: mockAddresses });
    });
  });

  describe('getUserAddress', () => {
    it('should return specific address', async () => {
      const addressId = 'addr123';
      const mockAddress = { address_id: addressId };
      wxService.findUserAddress.mockResolvedValue(mockAddress as any);

      const result = await controller.getUserAddress(addressId);

      expect(wxService.findUserAddress).toHaveBeenCalledWith(addressId);
      expect(result).toEqual({ message: 'ok', data: mockAddress });
    });
  });

  describe('editUserAddress', () => {
    it('should update address', async () => {
      const addressId = 'addr123';
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: UpdateAddressDto = {
        recipient: 'tony',
        phone: '1122',
        province: '123',
        city: '345',
        area: '456',
        town: '678',
        address: 'beijing',
        is_default: true,
        tag: 'tag',
      };
      const mockAddress = { address_id: addressId, ...dto };
      wxService.editUserAddress.mockResolvedValue(mockAddress as any);

      const result = await controller.editUserAddress(
        addressId,
        mockRequest,
        dto,
      );

      expect(wxService.editUserAddress).toHaveBeenCalledWith(
        addressId,
        dto,
        mockUser,
      );
      expect(result).toEqual({ message: 'ok', data: mockAddress });
    });
  });

  describe('createUserAddress', () => {
    it('should create new address', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: CreateAddressDto = {
        recipient: 'tony',
        phone: 'phone',
        province: '123',
        city: '345',
        area: '456',
        town: '789',
        address: 'shanghai',
        tag: 'tag',
        is_default: false,
      };
      const mockAddress = { address_id: 'new-addr', ...dto };
      wxService.createUserAddress.mockResolvedValue(mockAddress as any);

      const result = await controller.createUserAddress(mockRequest, dto);

      expect(wxService.createUserAddress).toHaveBeenCalledWith(mockUser, dto);
      expect(result).toEqual({ message: 'ok', data: mockAddress });
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile with password', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: UpdateUserDto & UpdateUserPasswordDto = {
        first_name: 'John',
        last_name: 'Xu',
        email: 'email',
        phone: 'phone',
        avatar: '',
        gender: 1,
        bio: 'bio',
        password: 'newPass',
      };
      const mockResult = { user_id: 'user123', first_name: 'John' };
      wxService.updateUserProfileWithPassword.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.updateUserProfile(mockRequest, dto);

      expect(wxService.updateUserProfileWithPassword).toHaveBeenCalledWith(
        mockUser,
        dto,
      );
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });

  describe('getHomeBanners', () => {
    it('should return home banners for mini app', async () => {
      const mockBanners = [{ banner_id: 'banner1' }];
      wxService.homeBannersForMiniApp.mockResolvedValue(mockBanners as any);

      const result = await controller.getHomeBanners();

      expect(wxService.homeBannersForMiniApp).toHaveBeenCalled();
      expect(result).toEqual({ message: 'ok', data: mockBanners });
    });
  });

  describe('getRecommendStores', () => {
    it('should return recommended stores with pagination', async () => {
      const page = '1';
      const pageSize = '5';
      const mockStores = [{ store_id: 'store1' }];
      wxService.recommendStoresForMiniApp.mockResolvedValue(mockStores as any);

      const result = await controller.getRecommendStores(page, pageSize);

      expect(wxService.recommendStoresForMiniApp).toHaveBeenCalledWith(0, 5);
      expect(result).toEqual({ message: 'ok', data: mockStores });
    });

    it('should handle default pagination', async () => {
      const mockStores = [{ store_id: 'store1' }];
      wxService.recommendStoresForMiniApp.mockResolvedValue(mockStores as any);

      const result = await controller.getRecommendStores(undefined, undefined);

      expect(wxService.recommendStoresForMiniApp).toHaveBeenCalledWith(0, 5);
      expect(result).toEqual({ message: 'ok', data: mockStores });
    });
  });

  describe('addFavoriteStore', () => {
    it('should add store to favorites', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const body = { store_id: 'store123' };
      wxService.addFavoriteStore.mockResolvedValue(undefined);

      const result = await controller.addFavoriteStore(mockRequest, body);

      expect(wxService.addFavoriteStore).toHaveBeenCalledWith(
        mockUser,
        'store123',
      );
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('removeFavoriteStore', () => {
    it('should remove store from favorites', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const storeId = 'store123';
      wxService.removeFavoriteStore.mockResolvedValue(undefined);

      const result = await controller.removeFavoriteStore(mockRequest, storeId);

      expect(wxService.removeFavoriteStore).toHaveBeenCalledWith(
        mockUser,
        storeId,
      );
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('isFavoriteStore', () => {
    it('should check if store is favorite', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const storeId = 'store123';
      wxService.isFavoriteStore.mockResolvedValue(true);

      const result = await controller.isFavoriteStore(mockRequest, storeId);

      expect(wxService.isFavoriteStore).toHaveBeenCalledWith(mockUser, storeId);
      expect(result).toEqual({ message: 'ok', data: { isFavorite: true } });
    });
  });

  describe('getFavoriteStores', () => {
    it('should return favorite stores with pagination', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const page = '2';
      const pageSize = '15';
      const mockStores = [{ store_id: 'store1' }];
      wxService.listFavoriteStores.mockResolvedValue(mockStores as any);

      const result = await controller.getFavoriteStores(
        mockRequest,
        page,
        pageSize,
      );

      expect(wxService.listFavoriteStores).toHaveBeenCalledWith(
        mockUser,
        1,
        15,
      );
      expect(result).toEqual({ message: 'ok', data: mockStores });
    });
  });

  describe('recordStoreBrowse', () => {
    it('should record store browse history', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const body = { store_id: 'store123' };
      wxService.recordStoreBrowse.mockResolvedValue(undefined);

      const result = await controller.recordStoreBrowse(mockRequest, body);

      expect(wxService.recordStoreBrowse).toHaveBeenCalledWith(
        mockUser,
        'store123',
      );
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('getStoreBrowseHistory', () => {
    it('should return store browse history with pagination', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const page = '1';
      const pageSize = '10';
      const mockHistory = [{ store_id: 'store1' }];
      wxService.listStoreBrowseHistory.mockResolvedValue(mockHistory as any);

      const result = await controller.getStoreBrowseHistory(
        mockRequest,
        page,
        pageSize,
      );

      expect(wxService.listStoreBrowseHistory).toHaveBeenCalledWith(
        mockUser,
        0,
        10,
      );
      expect(result).toEqual({ message: 'ok', data: mockHistory });
    });
  });

  describe('deleteStoreBrowse', () => {
    it('should delete store browse history', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const storeId = 'store123';
      wxService.deleteStoreBrowseHistory.mockResolvedValue(undefined);

      const result = await controller.deleteStoreBrowse(mockRequest, storeId);

      expect(wxService.deleteStoreBrowseHistory).toHaveBeenCalledWith(
        mockUser,
        storeId,
      );
      expect(result).toEqual({ message: 'ok' });
    });
  });
});
