import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { Request } from 'express';
import { UserEntity } from '../../users/entities/user.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { FindAllCategoryDto } from './dto/findAll-category.dto';
import { SwitchRankCategoryDto } from './dto/switch-rank-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryGoods } from './entities/category.entity';

describe('CategoryController', () => {
  let controller: CategoryController;
  let categoryService: jest.Mocked<CategoryService>;

  beforeEach(async () => {
    const mockCategoryService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      categoryTree: jest.fn(),
      switchRank: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      reactive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: mockCategoryService }],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    categoryService = module.get(
      CategoryService,
    ) as jest.Mocked<CategoryService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create category', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: CreateCategoryDto = {
        store_id: 'store123',
        name: 'Category',
        pid: '0',
      };
      const mockCategory = { category_id: 'cat1', ...dto };
      categoryService.create.mockResolvedValue(mockCategory as any);

      const result = await controller.create(mockRequest, dto);

      expect(categoryService.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockCategory);
    });
  });

  describe('findAll', () => {
    it('should return categories for store with optional pid', async () => {
      const storeId = 'store123';
      const query: FindAllCategoryDto = { pid: '0' };
      const mockCategories = [{ category_id: 'cat1', name: 'Category' }];
      categoryService.findAll.mockResolvedValue(mockCategories as any);

      const result = await controller.findAll(storeId, query);

      expect(categoryService.findAll).toHaveBeenCalledWith({
        store_id: storeId,
        pid: '0',
      });
      expect(result).toEqual(mockCategories);
    });
  });

  describe('categoryTree', () => {
    it('should return category tree for store', async () => {
      const storeId = 'store123';
      const mockTree = [{ category_id: 'cat1', children: [] }];
      categoryService.categoryTree.mockResolvedValue(mockTree as any);

      const result = await controller.categoryTree(storeId);

      expect(categoryService.categoryTree).toHaveBeenCalledWith(storeId);
      expect(result).toEqual({ data: mockTree });
    });
  });

  describe('switchRank', () => {
    it('should switch category rank', async () => {
      const categoryId = 'cat1';
      const dto: SwitchRankCategoryDto = { type: 'up' };
      const mockResult = { success: true };
      categoryService.switchRank.mockResolvedValue(mockResult as any);

      const result = await controller.switchRank(categoryId, dto);

      expect(categoryService.switchRank).toHaveBeenCalledWith(categoryId, dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('update', () => {
    it('should update category', async () => {
      const categoryId = 'cat1';
      const dto: UpdateCategoryDto = {
        name: 'Updated Category',
        pid: 'category_1',
      };
      const mockCategory: CategoryGoods = new CategoryGoods({
        store_id: 'store_1',
        category_id: 'category_1',
      });
      categoryService.update.mockResolvedValue(mockCategory);

      const result = await controller.update(categoryId, dto);

      expect(categoryService.update).toHaveBeenCalledWith(categoryId, dto);
      expect(result).toEqual(mockCategory);
    });
  });

  describe('remove', () => {
    it('should delete category', async () => {
      const categoryId = 'cat1';
      const mockCategory = { category_id: categoryId };
      categoryService.remove.mockResolvedValue(mockCategory as any);

      const result = await controller.remove(categoryId);

      expect(categoryService.remove).toHaveBeenCalledWith(categoryId);
      expect(result).toEqual(mockCategory);
    });
  });

  describe('reactive', () => {
    it('should reactive category', async () => {
      const categoryId = 'cat1';
      const mockCategory = { category_id: categoryId, status: 'active' };
      categoryService.reactive.mockResolvedValue(mockCategory as any);

      const result = await controller.reactive(categoryId);

      expect(categoryService.reactive).toHaveBeenCalledWith(categoryId);
      expect(result).toEqual(mockCategory);
    });
  });
});
