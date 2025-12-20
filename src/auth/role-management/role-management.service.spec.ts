import { Test, TestingModule } from '@nestjs/testing';
import { RoleManagementService } from './role-management.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache-manager/cache.service';

describe('RoleManagementService', () => {
  let service: RoleManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleManagementService, PrismaService, CacheService],
    }).compile();

    service = module.get<RoleManagementService>(RoleManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
