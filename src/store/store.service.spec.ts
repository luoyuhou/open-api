import { Test, TestingModule } from '@nestjs/testing';
import { StoreService } from './store.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../file/file.service';
import { STORE_ACTION_TYPES } from './const';
import { BadRequestException } from '@nestjs/common';

describe('StoreService', () => {
  let service: StoreService;
  let prisma: PrismaService;

  const mockFileService = {
    uploadFile: jest.fn(),
  };

  const mockStoreId = 'test-store-id';
  const mockUser = { user_id: 'user-1' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        {
          provide: PrismaService,
          useValue: {
            store: {
              findUnique: jest.fn(),
            },
            store_history: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        { provide: FileService, useValue: mockFileService },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getSettings', () => {
    it('应该返回默认设置，如果没有任何历史记录', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        store_id: mockStoreId,
      });
      (prisma.store_history.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getSettings(mockStoreId);

      expect(result).toEqual({
        pointsPerYuan: 1,
        pointsRedemptionRatio: 100,
        redemptionEnabled: true,
        redemptionDays: [],
      });
    });

    it('应该返回存储在最新历史记录中的设置', async () => {
      const mockSettings = {
        pointsPerYuan: 5,
        pointsRedemptionRatio: 50,
        redemptionEnabled: false,
        redemptionDays: ['Monday'],
      };

      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        store_id: mockStoreId,
      });
      (prisma.store_history.findFirst as jest.Mock).mockResolvedValue({
        payload: JSON.stringify(mockSettings),
      });

      const result = await service.getSettings(mockStoreId);

      expect(result).toEqual(mockSettings);
    });

    it('如果店铺不存在应该抛出错误', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getSettings('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateSettings', () => {
    it('应该创建一条新的设置更新历史记录', async () => {
      const newSettings = {
        pointsPerYuan: 2,
        pointsRedemptionRatio: 80,
        redemptionEnabled: true,
        redemptionDays: [1, 15],
      };

      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        store_id: mockStoreId,
      });
      (prisma.store_history.create as jest.Mock).mockResolvedValue({});

      const result = await service.updateSettings(
        mockStoreId,
        newSettings,
        mockUser,
      );

      expect(prisma.store_history.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          store_id: mockStoreId,
          action_type: STORE_ACTION_TYPES.UPDATED,
          action_content: 'UPDATE_SETTINGS',
          payload: JSON.stringify(newSettings),
          action_user_id: mockUser.user_id,
        }),
      });
      expect(result).toEqual(newSettings);
    });
  });
});
