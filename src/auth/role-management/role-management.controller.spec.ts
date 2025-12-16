import { Test, TestingModule } from '@nestjs/testing';
import { RoleManagementController } from './role-management.controller';
import { RoleManagementService } from './role-management.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache-manager/cache.service';

describe('RoleManagementController', () => {
  let controller: RoleManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleManagementController],
      providers: [RoleManagementService, PrismaService, CacheService],
    }).compile();

    controller = module.get<RoleManagementController>(RoleManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
