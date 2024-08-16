import { Test, TestingModule } from '@nestjs/testing';
import { ProvinceController } from './province.controller';
import { ProvinceService } from './province.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProvinceController', () => {
  let controller: ProvinceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvinceController],
      providers: [ProvinceService, PrismaService],
    }).compile();

    controller = module.get<ProvinceController>(ProvinceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
