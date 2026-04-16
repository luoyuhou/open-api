import { Test, TestingModule } from '@nestjs/testing';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { Request } from 'express';
import { UserEntity } from '../../users/entities/user.entity';
import { Pagination } from '../../common/dto/pagination';

describe('RatingController', () => {
  let controller: RatingController;
  let ratingService: jest.Mocked<RatingService>;

  beforeEach(async () => {
    const mockRatingService = {
      createRating: jest.fn(),
      getGoodsRatings: jest.fn(),
      getStoreRatings: jest.fn(),
      getOrderRating: jest.fn(),
      hideRating: jest.fn(),
      showRating: jest.fn(),
      getStoreRatingStats: jest.fn(),
      getStoreRanking: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RatingController],
      providers: [{ provide: RatingService, useValue: mockRatingService }],
    }).compile();

    controller = module.get<RatingController>(RatingController);
    ratingService = module.get(RatingService) as jest.Mocked<RatingService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createRating', () => {
    it('should create a rating', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto = {
        orderId: 'order1',
        goodsId: 'goods1',
        star: 5,
        content: 'Great!',
      };
      const mockRating = { rating_id: 'r1', ...dto };
      ratingService.createRating.mockResolvedValue(mockRating as any);

      const result = await controller.createRating(mockRequest, dto as any);

      expect(ratingService.createRating).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual({ message: 'ok', data: mockRating });
    });
  });

  describe('getGoodsRatings', () => {
    it('should return goods ratings', async () => {
      const goodsId = 'goods1';
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockData = { list: [], total: 0, avgStar: 4.5 };
      ratingService.getGoodsRatings.mockResolvedValue(mockData as any);

      const result = await controller.getGoodsRatings(goodsId, pagination);

      expect(ratingService.getGoodsRatings).toHaveBeenCalledWith(
        goodsId,
        pagination,
      );
      expect(result).toEqual({ message: 'ok', data: mockData });
    });
  });

  describe('getStoreRatings', () => {
    it('should return store ratings', async () => {
      const storeId = 'store1';
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockData = { list: [], total: 0 };
      ratingService.getStoreRatings.mockResolvedValue(mockData as any);

      const result = await controller.getStoreRatings(storeId, pagination);

      expect(ratingService.getStoreRatings).toHaveBeenCalledWith(
        storeId,
        pagination,
      );
      expect(result).toEqual({ message: 'ok', data: mockData });
    });
  });

  describe('getOrderRating', () => {
    it('should return order ratings', async () => {
      const orderId = 'order1';
      const mockRatings = [{ rating_id: 'r1' }];
      ratingService.getOrderRating.mockResolvedValue(mockRatings as any);

      const result = await controller.getOrderRating(orderId);

      expect(ratingService.getOrderRating).toHaveBeenCalledWith(orderId);
      expect(result).toEqual({ message: 'ok', data: mockRatings });
    });
  });

  describe('hideRating', () => {
    it('should hide rating', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      ratingService.hideRating.mockResolvedValue(undefined);

      const result = await controller.hideRating('r1', mockRequest);

      expect(ratingService.hideRating).toHaveBeenCalledWith('r1', mockUser);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('showRating', () => {
    it('should show rating', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      ratingService.showRating.mockResolvedValue(undefined);

      const result = await controller.showRating('r1', mockRequest);

      expect(ratingService.showRating).toHaveBeenCalledWith('r1', mockUser);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('getStoreRatingStats', () => {
    it('should return store rating stats', async () => {
      const storeId = 'store1';
      const mockStats = {
        store_id: storeId,
        avg_star: 4.5,
        rating: 100,
        order_count: 50,
      };
      ratingService.getStoreRatingStats.mockResolvedValue(mockStats as any);

      const result = await controller.getStoreRatingStats(storeId);

      expect(ratingService.getStoreRatingStats).toHaveBeenCalledWith(storeId);
      expect(result).toEqual({ message: 'ok', data: mockStats });
    });
  });

  describe('getStoreRanking', () => {
    it('should return store ranking list', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockData = { list: [], total: 100 };
      ratingService.getStoreRanking.mockResolvedValue(mockData as any);

      const result = await controller.getStoreRanking(pagination);

      expect(ratingService.getStoreRanking).toHaveBeenCalledWith(pagination);
      expect(result).toEqual({ message: 'ok', data: mockData });
    });
  });
});
