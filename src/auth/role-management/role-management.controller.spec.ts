import { Test, TestingModule } from '@nestjs/testing';
import { RoleManagementController } from './role-management.controller';
import { RoleManagementService } from './role-management.service';
import { Request } from 'express';
import { UserEntity } from '../../users/entities/user.entity';
import { Pagination } from '../../common/dto/pagination';
import { CreateAuthForRoleManagementDto } from './dto/create-auth-for-role-management.dto';
import { UpdateAuthForRoleManagementDto } from './dto/update-auth-for-role-management.dto';
import { UpsertRoleForRoleManagementDto } from './dto/upsert-role-for-role-management.dto';
import { CreateAuthRoleForRoleManagementDto } from './dto/create-authRole-for-role-management.dto';
import { CreateUserRoleForRoleManagementDto } from './dto/create-userRole-for-role-management.dto';
import { UpdateUserRoleForRoleManagementDto } from './dto/update-userRole-for-role-management.dto';

describe('RoleManagementController', () => {
  let controller: RoleManagementController;
  let roleManagementService: jest.Mocked<RoleManagementService>;

  beforeEach(async () => {
    const mockRoleManagementService = {
      authPagination: jest.fn(),
      createAuth: jest.fn(),
      updateAuth: jest.fn(),
      rolePagination: jest.fn(),
      createRole: jest.fn(),
      updateRole: jest.fn(),
      authRolePagination: jest.fn(),
      createAuthRole: jest.fn(),
      reactiveAuthRole: jest.fn(),
      frozenAuthRole: jest.fn(),
      userRolePagination: jest.fn(),
      createUserRole: jest.fn(),
      updateUserRole: jest.fn(),
      getOnlineUsersPagination: jest.fn(),
      kickUserOffline: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleManagementController],
      providers: [
        { provide: RoleManagementService, useValue: mockRoleManagementService },
      ],
    }).compile();

    controller = module.get<RoleManagementController>(RoleManagementController);
    roleManagementService = module.get(
      RoleManagementService,
    ) as jest.Mocked<RoleManagementService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('authPagination', () => {
    it('should return paginated auth list', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      roleManagementService.authPagination.mockResolvedValue(mockResult as any);

      const result = await controller.authPagination(pagination);

      expect(roleManagementService.authPagination).toHaveBeenCalledWith(
        pagination,
      );
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });

  describe('createAuth', () => {
    it('should create auth', async () => {
      const mockUser = { user_id: 'admin' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: CreateAuthForRoleManagementDto = {
        pid: 'pid',
        side: 1,
        path: 'a/b',
        method: 'get',
      };
      const mockAuth = { auth_id: 'auth1' };
      roleManagementService.createAuth.mockResolvedValue(mockAuth as any);

      const result = await controller.createAuth(mockRequest, dto);

      expect(roleManagementService.createAuth).toHaveBeenCalledWith(
        mockUser,
        dto,
      );
      expect(result).toEqual({ message: 'ok', data: mockAuth });
    });
  });

  describe('editAuth', () => {
    it('should update auth', async () => {
      const authId = 'auth1';
      const mockUser = { user_id: 'admin' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: UpdateAuthForRoleManagementDto = {
        pid: 'pid',
        side: 1,
        path: 'a/b',
        method: 'get',
        status: 0,
      };
      const mockAuth = { auth_id: authId, side: 1 };
      roleManagementService.updateAuth.mockResolvedValue(mockAuth as any);

      const result = await controller.editAuth(authId, mockRequest, dto);

      expect(roleManagementService.updateAuth).toHaveBeenCalledWith(
        authId,
        dto,
        mockUser,
      );
      expect(result).toEqual({ message: 'ok', data: mockAuth });
    });
  });

  describe('rolePagination', () => {
    it('should return paginated role list', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      roleManagementService.rolePagination.mockResolvedValue(mockResult as any);

      const result = await controller.rolePagination(pagination);

      expect(roleManagementService.rolePagination).toHaveBeenCalledWith(
        pagination,
      );
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });

  describe('createRole', () => {
    it('should create role', async () => {
      const mockUser = { user_id: 'admin' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: UpsertRoleForRoleManagementDto = {
        role_name: 'role1',
        description: 'Role 1',
      };
      const mockRole = { role_id: 'role1', name: 'Role 1' };
      roleManagementService.createRole.mockResolvedValue(mockRole as any);

      const result = await controller.createRole(mockRequest, dto);

      expect(roleManagementService.createRole).toHaveBeenCalledWith(
        dto,
        mockUser,
      );
      expect(result).toEqual({ message: 'ok', data: mockRole });
    });
  });

  describe('editRole', () => {
    it('should update role', async () => {
      const roleId = 'role1';
      const mockUser = { user_id: 'admin' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: UpsertRoleForRoleManagementDto = {
        role_name: 'role1',
        description: 'Updated Role',
      };
      const mockRole = { role_id: 'role1', name: 'Updated Role' };
      roleManagementService.updateRole.mockResolvedValue(mockRole as any);

      const result = await controller.editRole(roleId, mockRequest, dto);

      expect(roleManagementService.updateRole).toHaveBeenCalledWith(
        roleId,
        dto,
        mockUser,
      );
      expect(result).toEqual({ message: 'ok', data: mockRole });
    });
  });

  describe('deleteRole', () => {
    it('should return empty data for delete role', async () => {
      const result = await controller.deleteRole();

      expect(result).toEqual({ message: 'ok', data: [] });
    });
  });

  describe('authRolePagination', () => {
    it('should return paginated auth-role list', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      roleManagementService.authRolePagination.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.authRolePagination(pagination);

      expect(roleManagementService.authRolePagination).toHaveBeenCalledWith(
        pagination,
      );
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });

  describe('createAuthRole', () => {
    it('should create auth-role', async () => {
      const mockUser = { user_id: 'admin' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: CreateAuthRoleForRoleManagementDto = {
        auth_id: 'auth1',
        role_id: 'role1',
      };
      const mockAuthRole = { id: 1, auth_id: 'auth1', role_id: 'role1' };
      roleManagementService.createAuthRole.mockResolvedValue(
        mockAuthRole as any,
      );

      const result = await controller.createAuthRole(mockRequest, dto);

      expect(roleManagementService.createAuthRole).toHaveBeenCalledWith(
        dto,
        mockUser,
      );
      expect(result).toEqual({ message: 'ok', data: mockAuthRole });
    });
  });

  describe('editAuthRole', () => {
    it('should reactive auth-role', async () => {
      const id = '1';
      const mockUser = { user_id: 'admin' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const mockAuthRole = { id: 1, status: 'active' };
      roleManagementService.reactiveAuthRole.mockResolvedValue(
        mockAuthRole as any,
      );

      const result = await controller.editAuthRole(id, mockRequest);

      expect(roleManagementService.reactiveAuthRole).toHaveBeenCalledWith(
        1,
        mockUser,
      );
      expect(result).toEqual({ message: 'ok', data: mockAuthRole });
    });
  });

  describe('deleteAuthRole', () => {
    it('should freeze auth-role', async () => {
      const id = '1';
      const mockUser = { user_id: 'admin' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const mockAuthRole = { id: 1, status: 'frozen' };
      roleManagementService.frozenAuthRole.mockResolvedValue(
        mockAuthRole as any,
      );

      const result = await controller.deleteAuthRole(id, mockRequest);

      expect(roleManagementService.frozenAuthRole).toHaveBeenCalledWith(
        1,
        mockUser,
      );
      expect(result).toEqual({ message: 'ok', data: mockAuthRole });
    });
  });

  describe('userRolePagination', () => {
    it('should return paginated user-role list', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      roleManagementService.userRolePagination.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.userRolePagination(pagination);

      expect(roleManagementService.userRolePagination).toHaveBeenCalledWith(
        pagination,
      );
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });

  describe('createUserRole', () => {
    it('should create user-role', async () => {
      const mockUser = { user_id: 'admin' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: CreateUserRoleForRoleManagementDto = {
        user_id: 'user1',
        role_id: 'role1',
      };
      const mockUserRole = { id: 1, user_id: 'user1', role_id: 'role1' };
      roleManagementService.createUserRole.mockResolvedValue(
        mockUserRole as any,
      );

      const result = await controller.createUserRole(mockRequest, dto);

      expect(roleManagementService.createUserRole).toHaveBeenCalledWith(
        dto,
        mockUser,
      );
      expect(result).toEqual({ message: 'ok', data: mockUserRole });
    });
  });

  describe('editUserRole', () => {
    it('should update user-role', async () => {
      const id = '1';
      const mockUser = { user_id: 'admin' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto: UpdateUserRoleForRoleManagementDto = {
        user_id: 'user_1',
        role_id: 'role2',
        status: 0,
      };
      roleManagementService.updateUserRole.mockResolvedValue([] as any);

      const result = await controller.editUserRole(id, mockRequest, dto);

      expect(roleManagementService.updateUserRole).toHaveBeenCalledWith(
        1,
        dto,
        mockUser,
      );
      expect(result).toEqual({ message: 'ok', data: [] });
    });
  });

  describe('deleteUserRole', () => {
    it('should return empty data for delete user-role', async () => {
      const result = await controller.deleteUserRole();

      expect(result).toEqual({ message: 'ok', data: [] });
    });
  });

  describe('getOnlineUsersPagination', () => {
    it('should return paginated online users', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      roleManagementService.getOnlineUsersPagination.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.getOnlineUsersPagination(pagination);

      expect(
        roleManagementService.getOnlineUsersPagination,
      ).toHaveBeenCalledWith(pagination);
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });

  describe('kickUserOffline', () => {
    it('should kick user offline', async () => {
      const userId = 'user123';
      const mockResult = { success: true };
      roleManagementService.kickUserOffline.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.kickUserOffline(userId);

      expect(roleManagementService.kickUserOffline).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });
});
