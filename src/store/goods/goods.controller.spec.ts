import { Test, TestingModule } from '@nestjs/testing';
import { GoodsController } from './goods.controller';
import { GoodsService } from './goods.service';
import { CreateGoodDto } from './dto/create-good.dto';
import { UpdateGoodDto } from './dto/update-good.dto';
import { CreateGoodsVersionDto } from './dto/create-goods-version.dto';
import { UpdateGoodsVersionDto } from './dto/update-goods-version.dto';
import { Pagination } from '../../common/dto/pagination';
import { UpsertGoodsVersionDto } from './dto/upsert-goods-version.dto';
import { FileService } from '../../file/file.service';

describe('GoodsController', () => {
  let controller: GoodsController;
  let goodsService: jest.Mocked<GoodsService>;

  beforeEach(async () => {
    const mockGoodsService = {
      create: jest.fn(),
      pagination: jest.fn(),
      goodsVersions: jest.fn(),
      upsertGoodsVersion: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      reactive: jest.fn(),
      updateGoodsVersion: jest.fn(),
    };

    const mockFileService = {
      uploadFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoodsController],
      providers: [
        { provide: GoodsService, useValue: mockGoodsService },
        { provide: FileService, useValue: mockFileService },
      ],
    }).compile();

    controller = module.get<GoodsController>(GoodsController);
    goodsService = module.get(GoodsService) as jest.Mocked<GoodsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create goods with version', async () => {
      const dto: CreateGoodDto & CreateGoodsVersionDto = {
        store_id: 'store123',
        category_id: 'cat1',
        name: 'Product',
        price: 100,
        bar_code: '10010',
        count: 1,
        description: 'description',
        file: new File([], 'simple.png'),
        supplier: '',
        unit_name: '个',
        version_number: '',
      };
      const mockGoods = { goods_id: 'goods123', ...dto };
      goodsService.create.mockResolvedValue(mockGoods as any);

      const result = await controller.create(dto, undefined);

      expect(goodsService.create).toHaveBeenCalledWith(dto, undefined);
      expect(result).toEqual(mockGoods);
    });
  });

  describe('pagination', () => {
    it('should return paginated goods', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      goodsService.pagination.mockResolvedValue(mockResult as any);

      const result = await controller.pagination(pagination);

      expect(goodsService.pagination).toHaveBeenCalledWith(pagination);
      expect(result).toEqual(mockResult);
    });
  });

  describe('goodsVersions', () => {
    it('should return goods versions', async () => {
      const goodsId = 'goods123';
      const mockVersions = [{ version_id: 1, name: 'v1' }];
      goodsService.goodsVersions.mockResolvedValue(mockVersions as any);

      const result = await controller.goodsVersions(goodsId);

      expect(goodsService.goodsVersions).toHaveBeenCalledWith(goodsId);
      expect(result).toEqual({ data: mockVersions });
    });
  });

  describe('upsertGoodsVersion', () => {
    it('should upsert goods version', async () => {
      const goodsId = 'goods123';
      const dto: UpsertGoodsVersionDto = {
        status: 0,
        version_id: 'version_1',
        unit_name: '箱',
        count: 100,
        bar_code: '100011',
        supplier: '',
        file: new File([], 'test.png'),
        version_number: '10000',
        price: 1000,
      };
      const mockVersion = { version_id: 2, ...dto };
      goodsService.upsertGoodsVersion.mockResolvedValue(mockVersion as any);

      const result = await controller.upsertGoodsVersion(
        goodsId,
        dto,
        undefined,
      );

      expect(goodsService.upsertGoodsVersion).toHaveBeenCalledWith(
        goodsId,
        dto,
        undefined,
      );
      expect(result).toEqual(mockVersion);
    });
  });

  describe('findAll', () => {
    it('should return all goods for category', async () => {
      const categoryId = 'cat1';
      const mockGoods = [{ goods_id: 'goods1' }];
      goodsService.findAll.mockResolvedValue(mockGoods as any);

      const result = await controller.findAll(categoryId);

      expect(goodsService.findAll).toHaveBeenCalledWith(categoryId);
      expect(result).toEqual(mockGoods);
    });
  });

  describe('findOne', () => {
    it('should return goods by id', async () => {
      const goodsId = 'goods123';
      const mockGoods = { goods_id: goodsId, name: 'Product' };
      goodsService.findOne.mockResolvedValue(mockGoods as any);

      const result = await controller.findOne(goodsId);

      expect(goodsService.findOne).toHaveBeenCalledWith(goodsId);
      expect(result).toEqual({ data: mockGoods });
    });
  });

  describe('update', () => {
    it('should update goods', async () => {
      const goodsId = 'goods123';
      const dto: UpdateGoodDto = {
        category_id: 'category_1',
        name: 'name',
        description: 'description',
      };
      const mockGoods = { goods_id: goodsId, ...dto };
      goodsService.update.mockResolvedValue(mockGoods as any);

      const result = await controller.update(goodsId, dto);

      expect(goodsService.update).toHaveBeenCalledWith(goodsId, dto);
      expect(result).toEqual(mockGoods);
    });
  });

  describe('remove', () => {
    it('should delete goods', async () => {
      const goodsId = 'goods123';
      const mockGoods = { goods_id: goodsId };
      goodsService.remove.mockResolvedValue(mockGoods as any);

      const result = await controller.remove(goodsId);

      expect(goodsService.remove).toHaveBeenCalledWith(goodsId);
      expect(result).toEqual(mockGoods);
    });
  });

  describe('reactive', () => {
    it('should reactive goods', async () => {
      const goodsId = 'goods123';
      const mockGoods = { goods_id: goodsId, status: 'active' };
      goodsService.reactive.mockResolvedValue(mockGoods as any);

      const result = await controller.reactive(goodsId);

      expect(goodsService.reactive).toHaveBeenCalledWith(goodsId);
      expect(result).toEqual(mockGoods);
    });
  });

  describe('updateGoodsVersion', () => {
    it('should update goods version', async () => {
      const versionId = '1';
      const dto: UpdateGoodsVersionDto = {
        goods_id: 'goods_1',
        status: 1,
        version_number: 'version_1',
        price: 200,
        bar_code: '',
        count: 1,
        unit_name: '个',
        supplier: '',
      };
      const mockVersion = { version_id: 1, version_price: 150 };
      goodsService.updateGoodsVersion.mockResolvedValue(mockVersion as any);

      const result = await controller.updateGoodsVersion(versionId, dto);

      expect(goodsService.updateGoodsVersion).toHaveBeenCalledWith(
        versionId,
        dto,
      );
      expect(result).toEqual(mockVersion);
    });
  });
});
