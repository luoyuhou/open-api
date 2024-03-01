import { Test, TestingModule } from '@nestjs/testing';
import { RoleManagementController } from './role-management.controller';
import { RoleManagementService } from './role-management.service';

describe('RoleManagementController', () => {
  let controller: RoleManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleManagementController],
      providers: [RoleManagementService],
    }).compile();

    controller = module.get<RoleManagementController>(RoleManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
