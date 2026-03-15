import { Test, TestingModule } from '@nestjs/testing';
import { GoodsService } from './goods.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FileService } from '../../file/file.service';

describe('GoodsService', () => {
  let service: GoodsService;

  beforeEach(async () => {
    const mockFileService = {
      uploadFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsService,
        PrismaService,
        { provide: FileService, useValue: mockFileService },
      ],
    }).compile();

    service = module.get<GoodsService>(GoodsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
