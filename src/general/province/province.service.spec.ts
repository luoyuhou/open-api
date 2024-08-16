import { Test, TestingModule } from '@nestjs/testing';
import { ProvinceService } from './province.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProvinceService', () => {
  let service: ProvinceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProvinceService, PrismaService],
    }).compile();

    service = module.get<ProvinceService>(ProvinceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
