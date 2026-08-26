import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../file/file.service';
import { PlatformService } from '../platform/platform.service';
import { UserEntity } from '../users/entities/user.entity';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let prisma: PrismaService;
  let platformService: PlatformService;

  const user = { user_id: 'user-1', phone: '13800000001' } as UserEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: PrismaService,
          useValue: {
            user_feedback: {
              count: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
            },
            user_feedback_attachment: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: FileService,
          useValue: { uploadFile: jest.fn() },
        },
        {
          provide: PlatformService,
          useValue: { getDutyUserIds: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    prisma = module.get<PrismaService>(PrismaService);
    platformService = module.get<PlatformService>(PlatformService);
  });

  describe('create', () => {
    it('应创建 support 类留言', async () => {
      (prisma.user_feedback.count as jest.Mock).mockResolvedValue(0);
      (prisma.user_feedback.create as jest.Mock).mockResolvedValue({
        feedback_id: 'fb-1',
        title: '问题',
        category: 'support',
      });

      const result = await service.create(user, {
        title: '问题',
        content: '需要帮助',
        category: 'support',
      });

      expect(prisma.user_feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: 'support',
            user_id: user.user_id,
          }),
        }),
      );
      expect(result.feedback_id).toBe('fb-1');
    });

    it('超过每日上限时应拒绝', async () => {
      (prisma.user_feedback.count as jest.Mock).mockResolvedValue(3);

      await expect(
        service.create(user, { title: 't', content: 'c' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('countSupportPendingForDutyUser', () => {
    it('非值班用户返回 0', async () => {
      (platformService.getDutyUserIds as jest.Mock).mockResolvedValue([
        'admin-1',
      ]);

      const count = await service.countSupportPendingForDutyUser(user);

      expect(count).toBe(0);
      expect(prisma.user_feedback.count).not.toHaveBeenCalled();
    });

    it('值班用户返回待处理 support 留言数', async () => {
      (platformService.getDutyUserIds as jest.Mock).mockResolvedValue([
        user.user_id,
      ]);
      (prisma.user_feedback.count as jest.Mock).mockResolvedValue(2);

      const count = await service.countSupportPendingForDutyUser(user);

      expect(prisma.user_feedback.count).toHaveBeenCalledWith({
        where: {
          category: FeedbackService.SUPPORT_CATEGORY,
          status: 0,
        },
      });
      expect(count).toBe(2);
    });
  });
});
