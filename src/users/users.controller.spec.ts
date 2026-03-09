import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Pagination } from '../common/dto/pagination';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockUsersService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      usersPagination: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users as UserEntity array', async () => {
      const mockUsers = [
        { user_id: 'user1', phone: '123' },
        { user_id: 'user2', phone: '456' },
      ];
      usersService.findAll.mockResolvedValue(mockUsers as any);

      const result = await controller.findAll();

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(UserEntity);
      expect(result[0].user_id).toBe('user1');
    });
  });

  describe('findOne', () => {
    it('should return user by id as UserEntity', async () => {
      const userId = 'user123';
      const mockUser = { user_id: userId, phone: '123' };
      usersService.findOne.mockResolvedValue(mockUser as any);

      const result = await controller.findOne(userId);

      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(result).toBeInstanceOf(UserEntity);
      expect(result.user_id).toBe(userId);
    });
  });

  describe('usersPagination', () => {
    it('should return paginated users', async () => {
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockResult = { data: [], total: 0 };
      usersService.usersPagination.mockResolvedValue(mockResult as any);

      const result = await controller.usersPagination(pagination);

      expect(usersService.usersPagination).toHaveBeenCalledWith(pagination);
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });

  describe('update', () => {
    it('should update user and return UserEntity', async () => {
      const userId = 'user123';
      const dto: UpdateUserDto = {
        first_name: 'John',
        last_name: 'Xu',
        phone: 'phone',
        email: 'email',
        gender: 1,
        avatar: '',
        bio: '',
      };
      const mockUser = { user_id: userId, ...dto };
      usersService.update.mockResolvedValue(mockUser as any);

      const result = await controller.update(userId, dto);

      expect(usersService.update).toHaveBeenCalledWith(userId, dto);
      expect(result).toBeInstanceOf(UserEntity);
      expect(result.user_id).toBe(userId);
    });
  });
});
