import { Test, TestingModule } from '@nestjs/testing';
import { ProvinceController } from './province.controller';
import { ProvinceService } from './province.service';
import { SearchProvinceListDto } from './dto/search-province-list.dto';

describe('ProvinceController', () => {
  let controller: ProvinceController;
  let provinceService: jest.Mocked<ProvinceService>;

  beforeEach(async () => {
    const mockProvinceService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvinceController],
      providers: [{ provide: ProvinceService, useValue: mockProvinceService }],
    }).compile();

    controller = module.get<ProvinceController>(ProvinceController);
    provinceService = module.get(
      ProvinceService,
    ) as jest.Mocked<ProvinceService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all provinces with optional pid filter', async () => {
      const query: SearchProvinceListDto = { pid: '0' };
      const mockProvinces = [{ code: '110000', name: 'Beijing' }];
      provinceService.findAll.mockResolvedValue(mockProvinces as any);

      const result = await controller.findAll(query);

      expect(provinceService.findAll).toHaveBeenCalledWith('0');
      expect(result).toEqual(mockProvinces);
    });

    it('should return all provinces when pid not provided', async () => {
      const query: SearchProvinceListDto = { pid: undefined };
      const mockProvinces = [{ code: '110000', name: 'Beijing' }];
      provinceService.findAll.mockResolvedValue(mockProvinces as any);

      const result = await controller.findAll(query);

      expect(provinceService.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockProvinces);
    });
  });

  describe('findOne', () => {
    it('should return province by code', async () => {
      const code = '110000';
      const mockProvince = { code, name: 'Beijing' };
      provinceService.findOne.mockResolvedValue(mockProvince as any);

      const result = await controller.findOne(code);

      expect(provinceService.findOne).toHaveBeenCalledWith(code);
      expect(result).toEqual(mockProvince);
    });
  });
});
