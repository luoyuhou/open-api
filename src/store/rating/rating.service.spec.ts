import { Test, TestingModule } from '@nestjs/testing';
import { RatingService } from './rating.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RatingService', () => {
  let service: RatingService;
  let prisma: any;

  const defaultPagination = {
    pageNum: 0,
    pageSize: 10,
    sorted: [],
    filtered: [],
  };

  beforeEach(async () => {
    const mockPrisma = {
      user_order: {
        findUnique: jest.fn(),
      },
      store_goods: {
        findUnique: jest.fn(),
      },
      goods_rating: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        update: jest.fn(),
      },
      store_rating: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      store: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RatingService>(RatingService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRating', () => {
    it('should create rating successfully', async () => {
      const dto = {
        orderId: 'order1',
        goodsId: 'goods1',
        star: 5,
        content: 'Great!',
      };
      const user = { user_id: 'user1' } as any;
      const mockOrder = {
        order_id: 'order1',
        user_id: 'user1',
        store_id: 'store1',
      };
      const mockGoods = { goods_id: 'goods1', name: 'Product' };
      const mockRating = { rating_id: 'r1', ...dto };

      prisma.user_order.findUnique.mockResolvedValue(mockOrder);
      prisma.goods_rating.findFirst.mockResolvedValue(null);
      prisma.store_goods.findUnique.mockResolvedValue(mockGoods);
      prisma.goods_rating.create.mockResolvedValue(mockRating);
      prisma.goods_rating.aggregate.mockResolvedValue({
        _count: { rating_id: 1 },
        _avg: { star: 5 },
      });
      prisma.store_rating.upsert.mockResolvedValue({});

      const result = await service.createRating(dto, user);

      expect(result.rating_id).toBe('r1');
    });

    it('should throw error if order not found', async () => {
      const dto = {
        orderId: 'order1',
        goodsId: 'goods1',
        star: 5,
        content: 'Great!',
      };
      const user = { user_id: 'user1' } as any;

      prisma.user_order.findUnique.mockResolvedValue(null);

      await expect(service.createRating(dto, user)).rejects.toThrow(
        '订单不存在',
      );
    });

    it('should throw error if user not owner', async () => {
      const dto = {
        orderId: 'order1',
        goodsId: 'goods1',
        star: 5,
        content: 'Great!',
      };
      const user = { user_id: 'user1' } as any;
      const mockOrder = {
        order_id: 'order1',
        user_id: 'user2',
        store_id: 'store1',
      };

      prisma.user_order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.createRating(dto, user)).rejects.toThrow(
        '无权评价该订单',
      );
    });

    it('should throw error if already rated', async () => {
      const dto = {
        orderId: 'order1',
        goodsId: 'goods1',
        star: 5,
        content: 'Great!',
      };
      const user = { user_id: 'user1' } as any;
      const mockOrder = {
        order_id: 'order1',
        user_id: 'user1',
        store_id: 'store1',
      };
      const existingRating = { rating_id: 'r1' };

      prisma.user_order.findUnique.mockResolvedValue(mockOrder);
      prisma.goods_rating.findFirst.mockResolvedValue(existingRating);

      await expect(service.createRating(dto, user)).rejects.toThrow(
        '该商品已评价',
      );
    });
  });

  describe('getGoodsRatings', () => {
    it('should return paginated goods ratings', async () => {
      const mockRatings = [{ rating_id: 'r1', star: 5 }];
      prisma.goods_rating.findMany.mockResolvedValue(mockRatings);
      prisma.goods_rating.count.mockResolvedValue(1);
      prisma.goods_rating.aggregate.mockResolvedValue({ _avg: { star: 5 } });

      const result = await service.getGoodsRatings('goods1', defaultPagination);

      expect(result.list).toHaveLength(1);
      expect(result.avgStar).toBe(5);
    });
  });

  describe('getStoreRatings', () => {
    it('should return paginated store ratings', async () => {
      const mockRatings = [{ rating_id: 'r1', star: 5 }];
      prisma.goods_rating.findMany.mockResolvedValue(mockRatings);
      prisma.goods_rating.count.mockResolvedValue(1);

      const result = await service.getStoreRatings('store1', defaultPagination);

      expect(result.list).toHaveLength(1);
    });
  });

  describe('getOrderRating', () => {
    it('should return ratings for order', async () => {
      const mockRatings = [{ rating_id: 'r1' }];
      prisma.goods_rating.findMany.mockResolvedValue(mockRatings);

      const result = await service.getOrderRating('order1');

      expect(result).toEqual(mockRatings);
    });
  });

  describe('getStoreRatingStats', () => {
    it('should return stats if exists', async () => {
      const mockStats = {
        store_id: 'store1',
        avg_star: 4.5,
        rating: 100,
        order_count: 50,
      };
      prisma.store_rating.findUnique.mockResolvedValue(mockStats);

      const result = await service.getStoreRatingStats('store1');

      expect(result).toEqual(mockStats);
    });

    it('should return default stats if not exists', async () => {
      prisma.store_rating.findUnique.mockResolvedValue(null);

      const result = await service.getStoreRatingStats('store1');

      expect(result.avg_star).toBe(0);
      expect(result.rating).toBe(0);
    });
  });

  describe('getStoreRanking', () => {
    it('should return ranked stores', async () => {
      const mockRatings = [
        {
          store_id: 'store1',
          rating: 5,
          avg_star: 5,
          order_count: 100,
          updated_at: new Date(),
        },
        {
          store_id: 'store2',
          rating: 4.5,
          avg_star: 4.5,
          order_count: 50,
          updated_at: new Date(),
        },
      ];
      const mockStores = [
        { store_id: 'store1', store_name: 'Store 1', status: 1 },
        { store_id: 'store2', store_name: 'Store 2', status: 1 },
      ];

      prisma.store_rating.findMany.mockResolvedValue(mockRatings);
      prisma.store_rating.count.mockResolvedValue(2);
      prisma.store.findMany.mockResolvedValue(mockStores);

      const result = await service.getStoreRanking(defaultPagination);

      expect(result.list).toHaveLength(2);
      expect(result.list[0].rank).toBe(1);
      expect(result.list[0].store_name).toBe('Store 1');
    });
  });
});
