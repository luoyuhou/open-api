import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';
import { CreateChatGroupDto } from './dto/create-chat-group.dto';

jest.mock('uuid', () => ({
  v4: () => 'group-uuid',
}));

describe('ChatController', () => {
  let controller: ChatController;
  let prismaService: any;

  beforeEach(async () => {
    const mockPrismaService = {
      chat_group: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      chat_group_user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createGroup', () => {
    it('should create a new chat group and add members', async () => {
      const mockRequest = {
        user: { user_id: 'owner123' },
      } as unknown as Request;
      const createDto: CreateChatGroupDto = {
        name: 'Test Group',
        memberIds: ['member1', 'member2'],
      };
      const mockGroupId = 'group-uuid';
      prismaService.chat_group.create.mockResolvedValue({
        group_id: mockGroupId,
      });
      prismaService.chat_group_user.create.mockResolvedValue({});

      const result = await controller.createGroup(mockRequest, createDto);

      expect(prismaService.chat_group.create).toHaveBeenCalledWith({
        data: {
          group_id: expect.any(String),
          name: 'Test Group',
          owner_id: 'owner123',
          type: 2,
          status: 1,
        },
      });
      expect(prismaService.chat_group_user.create).toHaveBeenCalledTimes(3); // owner + 2 members
      expect(result).toEqual({
        groupId: mockGroupId,
        name: 'Test Group',
      });
    });

    it('should throw error if name is empty', async () => {
      const mockRequest = {
        user: { user_id: 'owner123' },
      } as unknown as Request;
      const createDto: CreateChatGroupDto = {
        name: '   ',
        memberIds: ['member1'],
      };

      await expect(
        controller.createGroup(mockRequest, createDto),
      ).rejects.toThrow('群聊名称不能为空');
    });
  });

  describe('listGroups', () => {
    it('should return list of groups for user', async () => {
      const mockRequest = {
        user: { user_id: 'user123' },
      } as unknown as Request;
      const mockRelations = [{ group_id: 'group1' }, { group_id: 'group2' }];
      const mockGroups = [
        { group_id: 'group1', name: 'Group 1' },
        { group_id: 'group2', name: 'Group 2' },
      ];
      prismaService.chat_group_user.findMany.mockResolvedValue(mockRelations);
      prismaService.chat_group.findMany.mockResolvedValue(mockGroups);

      const result = await controller.listGroups(mockRequest);

      expect(prismaService.chat_group_user.findMany).toHaveBeenCalledWith({
        where: { user_id: 'user123' },
      });
      expect(prismaService.chat_group.findMany).toHaveBeenCalledWith({
        where: {
          group_id: { in: ['group1', 'group2'] },
          status: 1,
        },
      });
      expect(result).toEqual([
        { groupId: 'group1', name: 'Group 1' },
        { groupId: 'group2', name: 'Group 2' },
      ]);
    });
  });

  describe('getGroupMembers', () => {
    it('should return group members', async () => {
      const mockRequest = {
        user: { user_id: 'user123' },
      } as unknown as Request;
      const groupId = 'group1';
      const mockRelation = { user_id: 'user123', group_id: groupId };
      const mockMembers = [
        { user_id: 'user123', role: 1 },
        { user_id: 'user456', role: 0 },
      ];
      const mockUsers = [
        {
          user_id: 'user123',
          first_name: 'John',
          last_name: 'Doe',
          phone: '123',
          email: 'john@example.com',
          avatar: 'avatar1',
        },
        {
          user_id: 'user456',
          first_name: 'Jane',
          last_name: 'Smith',
          phone: '456',
          email: 'jane@example.com',
          avatar: 'avatar2',
        },
      ];
      prismaService.chat_group_user.findFirst.mockResolvedValue(mockRelation);
      prismaService.chat_group_user.findMany.mockResolvedValue(mockMembers);
      prismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await controller.getGroupMembers(mockRequest, groupId);

      expect(prismaService.chat_group_user.findFirst).toHaveBeenCalledWith({
        where: { user_id: 'user123', group_id: groupId },
      });
      expect(prismaService.chat_group_user.findMany).toHaveBeenCalledWith({
        where: { group_id: groupId },
      });
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { user_id: { in: ['user123', 'user456'] } },
      });
      expect(result).toEqual([
        {
          userId: 'user123',
          firstName: 'John',
          lastName: 'Doe',
          phone: '123',
          email: 'john@example.com',
          avatar: 'avatar1',
        },
        {
          userId: 'user456',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '456',
          email: 'jane@example.com',
          avatar: 'avatar2',
        },
      ]);
    });
  });
});
