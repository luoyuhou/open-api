import { Test, TestingModule } from '@nestjs/testing';
import { GoodsService } from './goods.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('GoodsService', () => {
  let service: GoodsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoodsService, PrismaService],
    }).compile();

    service = module.get<GoodsService>(GoodsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
