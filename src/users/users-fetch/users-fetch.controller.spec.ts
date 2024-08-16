import { Test, TestingModule } from '@nestjs/testing';
import { UsersFetchController } from './users-fetch.controller';
import { UsersFetchService } from './users-fetch.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersFetchController', () => {
  let controller: UsersFetchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersFetchController],
      providers: [UsersFetchService, PrismaService],
    }).compile();

    controller = module.get<UsersFetchController>(UsersFetchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
