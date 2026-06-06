import { Test, TestingModule } from '@nestjs/testing';
import { GoodsService } from './goods.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FileService } from '../../file/file.service';
import { StoreResourceService } from '../store-resource/store-resource.service';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('GoodsService', () => {
  let service: GoodsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockFileService = {
      uploadFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsService,
        {
          provide: PrismaService,
          useValue: {
            store_goods: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            store_goods_version: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
            category_goods: {
              findMany: jest.fn(),
            },
            store: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
            $queryRawUnsafe: jest.fn(),
          },
        },
        {
          provide: StoreResourceService,
          useValue: {
            getUsedQuota: jest.fn(),
            invalidateUsedQuota: jest.fn(),
          },
        },
        { provide: FileService, useValue: mockFileService },
      ],
    }).compile();

    service = module.get<GoodsService>(GoodsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('formatCategoryIds', () => {
    it('应该正确合并单个 ID 和数组 ID 并排序', () => {
      // 访问私有方法进行测试
      const result = (service as any).formatCategoryIds([
        'cat3',
        'cat2',
        'cat1',
      ]);
      expect(result).toBe('cat1,cat2,cat3');
    });

    it('应该处理为空的情况', () => {
      expect((service as any).formatCategoryIds(undefined)).toBe('');
      expect((service as any).formatCategoryIds(['cat1'])).toBe('cat1');
    });
  });

  describe('create with multiple categories', () => {
    it('应该使用合并后的分类 ID 创建商品', async () => {
      const dto = {
        store_id: 'store-1',
        name: '多分类商品',
        category_ids: ['cat-a', 'cat-b'],
        price: 100,
        count: 10,
        unit_name: '件',
      } as any;

      (prisma.store_goods.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.store_goods.create as jest.Mock).mockResolvedValue({
        goods_id: 'mock-uuid',
      });

      await service.create(dto);

      expect(prisma.store_goods.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category_id: 'cat-a,cat-b',
          name: '多分类商品',
        }),
      });
    });
  });

  describe('findOne with multiple categories', () => {
    it('应该解析逗号分隔的分类 ID 并返回数组和名称', async () => {
      const mockGoods = {
        goods_id: 'g1',
        category_id: 'cat1,cat2',
        store_id: 's1',
        name: '测试商品',
        id: BigInt(1),
      };

      (prisma.store_goods.findUnique as jest.Mock).mockResolvedValue(mockGoods);
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        store_name: '测试店',
      });
      (prisma.category_goods.findMany as jest.Mock).mockResolvedValue([
        { category_id: 'cat1', name: '分类一' },
        { category_id: 'cat2', name: '分类二' },
      ]);

      const result = await service.findOne('g1');

      expect(result.category_ids).toEqual(['cat1', 'cat2']);
      expect(result.category_name).toBe('分类一, 分类二');
    });
  });

  describe('update categories', () => {
    it('应该更新为新的多分类字符串', async () => {
      const updateDto = {
        category_ids: ['new-cat1', 'new-cat2'],
      } as any;

      (prisma.store_goods.findFirst as jest.Mock).mockResolvedValue({
        goods_id: 'g1',
      });

      await service.update('g1', updateDto);

      expect(prisma.store_goods.update).toHaveBeenCalledWith({
        where: { goods_id: 'g1' },
        data: expect.objectContaining({
          category_id: 'new-cat1,new-cat2',
        }),
      });
    });
  });
});
