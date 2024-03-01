import { Test, TestingModule } from '@nestjs/testing';
import { RoleManagementService } from './role-management.service';

describe('RoleManagementService', () => {
  let service: RoleManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleManagementService],
    }).compile();

    service = module.get<RoleManagementService>(RoleManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
