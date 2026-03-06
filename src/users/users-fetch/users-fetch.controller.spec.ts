import { Test, TestingModule } from '@nestjs/testing';
import { UsersFetchController } from './users-fetch.controller';
import { UsersFetchService } from './users-fetch.service';
import { Request } from 'express';
import { UserEntity } from '../entities/user.entity';
import { Pagination } from '../../common/dto/pagination';

describe('UsersFetchController', () => {
  let controller: UsersFetchController;
  let usersFetchService: jest.Mocked<UsersFetchService>;

  beforeEach(async () => {
    const mockUsersFetchService = {
      realtime: jest.fn(),
      fetchPagination: jest.fn(),
      loginPagination: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersFetchController],
      providers: [
        { provide: UsersFetchService, useValue: mockUsersFetchService },
      ],
    }).compile();

    controller = module.get<UsersFetchController>(UsersFetchController);
    usersFetchService = module.get(
      UsersFetchService,
    ) as jest.Mocked<UsersFetchService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('realtime', () => {
    it('should return realtime user data', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const mockData = [{ user_id: 'user123', online: true }];
      usersFetchService.realtime.mockResolvedValue(mockData as any);

      const result = await controller.realtime(mockRequest);

      expect(usersFetchService.realtime).toHaveBeenCalledWith('user123');
      expect(result).toEqual({ data: mockData });
    });

    it('should handle missing user', async () => {
      const mockRequest = { user: null } as Request;
      const mockData = [];
      usersFetchService.realtime.mockResolvedValue(mockData as any);

      const result = await controller.realtime(mockRequest);

      expect(usersFetchService.realtime).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ data: mockData });
    });
  });

  describe('fetchPagination', () => {
    it('should return paginated user fetch data', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      usersFetchService.fetchPagination.mockResolvedValue(mockResult as any);

      const result = await controller.fetchPagination(pagination);

      expect(usersFetchService.fetchPagination).toHaveBeenCalledWith(
        pagination,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('loginPagination', () => {
    it('should return paginated user login data', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      usersFetchService.loginPagination.mockResolvedValue(mockResult as any);

      const result = await controller.loginPagination(pagination);

      expect(usersFetchService.loginPagination).toHaveBeenCalledWith(
        pagination,
      );
      expect(result).toEqual(mockResult);
    });
  });
});
