import { Test, TestingModule } from '@nestjs/testing';
import { UsersFetchService } from './users-fetch.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersFetchService', () => {
  let service: UsersFetchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersFetchService, PrismaService],
    }).compile();

    service = module.get<UsersFetchService>(UsersFetchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
