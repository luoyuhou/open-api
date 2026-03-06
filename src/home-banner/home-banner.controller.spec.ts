import { Test, TestingModule } from '@nestjs/testing';
import { HomeBannerController } from './home-banner.controller';
import { HomeBannerService } from './home-banner.service';
import { Pagination } from '../common/dto/pagination';
import { CreateHomeBannerDto } from './dto/create-home-banner.dto';
import { UpdateHomeBannerDto } from './dto/update-home-banner.dto';

describe('HomeBannerController', () => {
  let controller: HomeBannerController;
  let homeBannerService: jest.Mocked<HomeBannerService>;

  beforeEach(async () => {
    const mockHomeBannerService = {
      pagination: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeBannerController],
      providers: [
        { provide: HomeBannerService, useValue: mockHomeBannerService },
      ],
    }).compile();

    controller = module.get<HomeBannerController>(HomeBannerController);
    homeBannerService = module.get(
      HomeBannerService,
    ) as jest.Mocked<HomeBannerService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('pagination', () => {
    it('should return paginated banners', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [{ banner_id: '1' }], total: 1 };
      homeBannerService.pagination.mockResolvedValue(mockResult as any);

      const result = await controller.pagination(pagination);

      expect(homeBannerService.pagination).toHaveBeenCalledWith(pagination);
      expect(result).toEqual(mockResult);
    });
  });

  describe('create', () => {
    it('should create a new banner', async () => {
      const dto: CreateHomeBannerDto = {
        title: 'Banner',
        image_url: 'url',
      };
      const mockBanner = { banner_id: 'new-id', ...dto };
      homeBannerService.create.mockResolvedValue(mockBanner as any);

      const result = await controller.create(dto);

      expect(homeBannerService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockBanner);
    });
  });

  describe('update', () => {
    it('should update banner', async () => {
      const bannerId = 'banner123';
      const dto: UpdateHomeBannerDto = { title: 'Updated' };
      const mockBanner = { banner_id: bannerId, title: 'Updated' };
      homeBannerService.update.mockResolvedValue(mockBanner as any);

      const result = await controller.update(bannerId, dto);

      expect(homeBannerService.update).toHaveBeenCalledWith(bannerId, dto);
      expect(result).toEqual(mockBanner);
    });
  });

  describe('remove', () => {
    it('should remove banner', async () => {
      const bannerId = 'banner123';
      const mockBanner = { banner_id: bannerId };
      homeBannerService.remove.mockResolvedValue(mockBanner as any);

      const result = await controller.remove(bannerId);

      expect(homeBannerService.remove).toHaveBeenCalledWith(bannerId);
      expect(result).toEqual(mockBanner);
    });
  });
});
