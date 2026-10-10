import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PublisherService } from './publisher.service';
import { PublisherMediaService } from './publisher-media.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from '../users/entities/user.entity';
import { PUBLISHER_PLATFORMS } from './publisher.const';

describe('PublisherService (platform catalog)', () => {
  let service: PublisherService;
  let prisma: {
    content_publish_platform: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    content_platform_account: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user_alqq_credential: {
      count: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    user_auth: { findFirst: jest.Mock };
    content_article: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    content_publish_job: { create: jest.Mock };
  };

  const user = { user_id: 'user-1' } as UserEntity;
  const admin = { user_id: 'admin-1' } as UserEntity;

  const catalogRow = (
    partial: Partial<{
      platform_id: string;
      name: string;
      color: string;
      login_url: string;
      hint: string;
      enabled: boolean;
      sort: number;
    }> = {},
  ) => ({
    platform_id: 'wechat',
    name: '微信公众号',
    color: '#07C160',
    login_url: 'https://mp.weixin.qq.com/',
    hint: 'hint',
    enabled: true,
    sort: 10,
    ...partial,
  });

  /** 目录已齐全，跳过 seed create */
  const stubCatalogSeeded = (
    rows: ReturnType<typeof catalogRow>[],
    options?: { onlyEnabled?: ReturnType<typeof catalogRow>[] },
  ) => {
    const allIds = PUBLISHER_PLATFORMS.map((p) => ({ platform_id: p.id }));
    prisma.content_publish_platform.findMany.mockImplementation(
      (args?: {
        select?: { platform_id?: boolean };
        where?: { enabled?: boolean };
      }) => {
        if (args?.select?.platform_id) {
          return Promise.resolve(allIds);
        }
        if (args?.where?.enabled === true) {
          return Promise.resolve(
            options?.onlyEnabled ?? rows.filter((r) => r.enabled),
          );
        }
        return Promise.resolve(rows);
      },
    );
  };

  beforeEach(async () => {
    prisma = {
      content_publish_platform: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      content_platform_account: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user_alqq_credential: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      user_auth: { findFirst: jest.fn() },
      content_article: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      content_publish_job: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublisherService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PublisherMediaService,
          useValue: {
            uploadForUser: jest.fn(),
            releaseUrl: jest.fn(),
            attachAsset: jest.fn(),
            syncArticleAssets: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PublisherService);
  });

  describe('ensurePlatformCatalog / listPlatforms', () => {
    it('应增量补齐缺失的 seed 平台', async () => {
      prisma.content_publish_platform.findMany
        .mockResolvedValueOnce([]) // ensure seed 探测
        .mockResolvedValueOnce([
          catalogRow({ platform_id: 'wechat', enabled: true }),
        ]);
      prisma.content_publish_platform.create.mockResolvedValue({});

      await service.listPlatforms();

      expect(prisma.content_publish_platform.create).toHaveBeenCalledTimes(
        PUBLISHER_PLATFORMS.length,
      );
      expect(prisma.content_publish_platform.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            platform_id: 'youtube',
            enabled: false,
          }),
        }),
      );
    });

    it('已存在的平台不应被 seed 覆盖', async () => {
      stubCatalogSeeded([catalogRow()]);
      await service.listPlatforms();
      expect(prisma.content_publish_platform.create).not.toHaveBeenCalled();
    });

    it('listPlatforms 只返回启用中的平台', async () => {
      stubCatalogSeeded(
        [
          catalogRow({ platform_id: 'wechat', enabled: true }),
          catalogRow({
            platform_id: 'youtube',
            name: 'YouTube',
            enabled: false,
            sort: 900,
          }),
        ],
        {
          onlyEnabled: [catalogRow({ platform_id: 'wechat', enabled: true })],
        },
      );

      const result = await service.listPlatforms();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'wechat',
        name: '微信公众号',
        enabled: true,
      });
    });
  });

  describe('admin platform CRUD', () => {
    const grantAdmin = () => {
      prisma.user_auth.findFirst.mockResolvedValue({
        user_id: admin.user_id,
        is_admin: true,
        status: 1,
      });
    };

    it('非管理员 listAdminPlatforms 应 Forbidden', async () => {
      prisma.user_auth.findFirst.mockResolvedValue({
        user_id: user.user_id,
        is_admin: false,
        status: 1,
      });

      await expect(service.listAdminPlatforms(user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('管理员 listAdminPlatforms 返回含下线平台', async () => {
      grantAdmin();
      stubCatalogSeeded([
        catalogRow({ platform_id: 'wechat', enabled: true }),
        catalogRow({
          platform_id: 'youtube',
          name: 'YouTube',
          enabled: false,
        }),
      ]);

      const result = await service.listAdminPlatforms(admin);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id).sort()).toEqual(['wechat', 'youtube']);
    });

    it('createAdminPlatform 重复 ID 抛 BadRequest', async () => {
      grantAdmin();
      stubCatalogSeeded([catalogRow()]);
      prisma.content_publish_platform.findFirst.mockResolvedValue(catalogRow());

      await expect(
        service.createAdminPlatform(admin, {
          platformId: 'wechat',
          name: '重复',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('createAdminPlatform 成功创建', async () => {
      grantAdmin();
      stubCatalogSeeded([]);
      prisma.content_publish_platform.findFirst.mockResolvedValue(null);
      const created = catalogRow({
        platform_id: 'custom_site',
        name: '自建站',
        enabled: true,
        sort: 50,
      });
      prisma.content_publish_platform.create.mockResolvedValue(created);

      const result = await service.createAdminPlatform(admin, {
        platformId: 'custom_site',
        name: '自建站',
        sort: 50,
      });

      expect(result).toMatchObject({
        id: 'custom_site',
        name: '自建站',
        enabled: true,
        sort: 50,
      });
    });

    it('updateAdminPlatform 平台不存在抛 NotFound', async () => {
      grantAdmin();
      stubCatalogSeeded([]);
      prisma.content_publish_platform.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAdminPlatform(admin, 'missing', { enabled: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updateAdminPlatform 可下线平台', async () => {
      grantAdmin();
      stubCatalogSeeded([catalogRow()]);
      prisma.content_publish_platform.findFirst.mockResolvedValue(catalogRow());
      prisma.content_publish_platform.update.mockResolvedValue(
        catalogRow({ enabled: false }),
      );

      const result = await service.updateAdminPlatform(admin, 'wechat', {
        enabled: false,
      });

      expect(prisma.content_publish_platform.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { platform_id: 'wechat' },
          data: expect.objectContaining({ enabled: false }),
        }),
      );
      expect(result.enabled).toBe(false);
    });

    it('非管理员 createAdminPlatform 应 Forbidden', async () => {
      prisma.user_auth.findFirst.mockResolvedValue({
        user_id: user.user_id,
        is_admin: false,
        status: 1,
      });

      await expect(
        service.createAdminPlatform(user, {
          platformId: 'custom',
          name: '自建',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.content_publish_platform.create).not.toHaveBeenCalled();
    });

    it('非管理员 updateAdminPlatform 应 Forbidden', async () => {
      prisma.user_auth.findFirst.mockResolvedValue({
        user_id: user.user_id,
        is_admin: false,
        status: 1,
      });

      await expect(
        service.updateAdminPlatform(user, 'wechat', { enabled: false }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.content_publish_platform.update).not.toHaveBeenCalled();
    });

    it('updateAdminPlatform 可改名称与排序', async () => {
      grantAdmin();
      stubCatalogSeeded([catalogRow()]);
      prisma.content_publish_platform.findFirst.mockResolvedValue(catalogRow());
      prisma.content_publish_platform.update.mockResolvedValue(
        catalogRow({ name: '微信号', sort: 3 }),
      );

      const result = await service.updateAdminPlatform(admin, 'wechat', {
        name: '微信号',
        sort: 3,
      });

      expect(prisma.content_publish_platform.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { platform_id: 'wechat' },
          data: expect.objectContaining({ name: '微信号', sort: 3 }),
        }),
      );
      expect(result).toMatchObject({ name: '微信号', sort: 3 });
    });
  });

  describe('ensureAccounts / listAccounts / getAccount', () => {
    const cred = {
      credential_id: 'cred-1',
      name: '主账号',
      is_default: true,
      api_key_hint: '****',
      last_verified_at: null,
    };

    beforeEach(() => {
      jest.spyOn(service as any, 'syncFromAlqq').mockResolvedValue(undefined);
    });

    it('ensureAccounts 只为启用平台补齐账号行', async () => {
      stubCatalogSeeded(
        [
          catalogRow({ platform_id: 'wechat', enabled: true }),
          catalogRow({
            platform_id: 'youtube',
            name: 'YouTube',
            enabled: false,
          }),
        ],
        {
          onlyEnabled: [catalogRow({ platform_id: 'wechat', enabled: true })],
        },
      );
      prisma.content_platform_account.findMany
        .mockResolvedValueOnce([]) // existing
        .mockResolvedValueOnce([
          {
            account_id: 'acc_1',
            platform_id: 'wechat',
            user_id: user.user_id,
            alqq_credential_id: 'cred-1',
            account_name: '未绑定微信公众号',
            bound: false,
          },
        ]);
      prisma.content_platform_account.create.mockResolvedValue({});

      await service.ensureAccounts(user, 'cred-1');

      expect(prisma.content_platform_account.create).toHaveBeenCalledTimes(1);
      expect(prisma.content_platform_account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            platform_id: 'wechat',
            alqq_credential_id: 'cred-1',
          }),
        }),
      );
    });

    it('ensureAccounts 已有账号行时不再 create', async () => {
      stubCatalogSeeded(
        [catalogRow({ platform_id: 'wechat', enabled: true })],
        {
          onlyEnabled: [catalogRow({ platform_id: 'wechat', enabled: true })],
        },
      );
      const existing = {
        account_id: 'acc_1',
        platform_id: 'wechat',
        user_id: user.user_id,
        alqq_credential_id: 'cred-1',
        account_name: '公众号',
        bound: true,
      };
      prisma.content_platform_account.findMany
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([existing]);

      await service.ensureAccounts(user, 'cred-1');

      expect(prisma.content_platform_account.create).not.toHaveBeenCalled();
    });

    it('listAccounts 隐藏已下线平台账号', async () => {
      prisma.user_alqq_credential.count.mockResolvedValue(1);
      prisma.user_alqq_credential.findFirst.mockResolvedValue(cred);
      stubCatalogSeeded(
        [
          catalogRow({ platform_id: 'wechat', enabled: true }),
          catalogRow({
            platform_id: 'youtube',
            name: 'YouTube',
            enabled: false,
          }),
        ],
        {
          onlyEnabled: [catalogRow({ platform_id: 'wechat', enabled: true })],
        },
      );
      prisma.content_platform_account.findMany
        .mockResolvedValueOnce([
          {
            account_id: 'acc_wechat',
            platform_id: 'wechat',
            account_name: '公众号',
            bound: true,
            alqq_credential_id: 'cred-1',
          },
        ]) // ensureAccounts existing
        .mockResolvedValueOnce([
          {
            account_id: 'acc_wechat',
            platform_id: 'wechat',
            account_name: '公众号',
            bound: true,
            alqq_credential_id: 'cred-1',
          },
        ]) // ensureAccounts return
        .mockResolvedValueOnce([
          {
            account_id: 'acc_wechat',
            platform_id: 'wechat',
            account_name: '公众号',
            bound: true,
            alqq_credential_id: 'cred-1',
          },
          {
            account_id: 'acc_yt',
            platform_id: 'youtube',
            account_name: '历史 YouTube',
            bound: false,
            alqq_credential_id: 'cred-1',
          },
        ]); // listAccounts final rows

      const result = await service.listAccounts(user, 'cred-1');

      expect(result).toHaveLength(1);
      expect(result[0].platformId).toBe('wechat');
      expect(result[0].credentialName).toBe('主账号');
    });

    it('getAccount 对下线平台抛 NotFound', async () => {
      prisma.content_platform_account.findFirst.mockResolvedValue({
        account_id: 'acc_yt',
        platform_id: 'youtube',
        account_name: '历史',
        bound: false,
        user_id: user.user_id,
      });
      stubCatalogSeeded(
        [
          catalogRow({
            platform_id: 'youtube',
            name: 'YouTube',
            enabled: false,
          }),
        ],
        { onlyEnabled: [] },
      );

      await expect(service.getAccount(user, 'acc_yt')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('startBind 对下线平台抛 BadRequest', async () => {
      prisma.content_platform_account.findFirst.mockResolvedValue({
        account_id: 'acc_yt',
        platform_id: 'youtube',
        alqq_credential_id: 'cred-1',
        user_id: user.user_id,
      });
      stubCatalogSeeded(
        [
          catalogRow({
            platform_id: 'youtube',
            name: 'YouTube',
            enabled: false,
          }),
        ],
        { onlyEnabled: [] },
      );

      await expect(service.startBind(user, 'acc_yt')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('publish offline guard', () => {
    it('包含已下线平台时应拒绝发布', async () => {
      prisma.content_article.findFirst.mockResolvedValue({
        article_id: 'art-1',
        user_id: user.user_id,
        title: '标题',
        content: '正文内容',
        digest: '',
        cover: null,
        status: 'draft',
        platforms: '[]',
        create_date: new Date(),
        update_date: new Date(),
      });
      stubCatalogSeeded(
        [
          catalogRow({ platform_id: 'wechat', enabled: true }),
          catalogRow({
            platform_id: 'youtube',
            name: 'YouTube',
            enabled: false,
          }),
        ],
        {
          onlyEnabled: [catalogRow({ platform_id: 'wechat', enabled: true })],
        },
      );

      await expect(
        service.publish(user, {
          articleId: 'art-1',
          platformIds: ['wechat', 'youtube'],
          mode: 'publish',
        }),
      ).rejects.toThrow(/已下线/);
      expect(prisma.content_publish_job.create).not.toHaveBeenCalled();
    });
  });

  describe('publish-logs 阅读/互动回填', () => {
    it('extractRemoteMetrics 优先 metric_* 并汇总互动', () => {
      const metrics = (service as any).extractRemoteMetrics({
        metric_reads: 1200,
        metric_likes: 10,
        metric_comments: 3,
        metric_shares: 2,
      });
      expect(metrics).toEqual({ readCount: 1200, interactCount: 15 });
    });

    it('extractRemoteMetrics 有 interact_count 时不叠加 likes', () => {
      const metrics = (service as any).extractRemoteMetrics({
        readCount: 9,
        interact_count: 4,
        like_count: 100,
      });
      expect(metrics).toEqual({ readCount: 9, interactCount: 4 });
    });

    it('matchAnalyticsItem 优先按 alqqLogId 匹配', () => {
      const matched = (service as any).matchAnalyticsItem(
        { platformId: 'wechat', alqqLogId: '88', status: 'success' },
        [
          {
            id: 88,
            platform: 'wechat',
            content_title: '别的标题',
            metric_reads: 1,
          },
          {
            id: 99,
            platform: 'wechat',
            content_title: '目标标题',
            metric_reads: 99,
          },
        ],
        '目标标题',
      );
      expect(matched.id).toBe(88);
    });

    it('matchAnalyticsItem 无 logId 时按标题模糊匹配', () => {
      const matched = (service as any).matchAnalyticsItem(
        { platformId: 'baijiahao', status: 'success' },
        [
          {
            id: 1,
            platform: 'baijiahao',
            content_title: '今日热点：目标标题补充',
            metric_reads: 50,
          },
        ],
        '目标标题',
      );
      expect(matched.id).toBe(1);
    });

    it('enrichTargetsWithAnalytics 回填阅读互动并打 statsCheckedAt', async () => {
      const session = {
        listPublishLogs: jest.fn().mockResolvedValue([
          {
            id: 'log-1',
            platform: 'wechat',
            content_title: '发文标题',
            metric_reads: 321,
            metric_likes: 5,
            metric_comments: 1,
            platform_public_url: 'https://mp.weixin.qq.com/s/x',
          },
        ]),
        listRecentPublishLogs: jest.fn().mockResolvedValue([]),
      };

      const targets = await (service as any).enrichTargetsWithAnalytics(
        session,
        [
          {
            platformId: 'wechat',
            status: 'success',
            alqqLogId: 'log-1',
            readCount: null,
            interactCount: null,
          },
          {
            platformId: 'zhihu',
            status: 'failed',
            readCount: null,
            interactCount: null,
          },
        ],
        '发文标题',
      );

      expect(session.listPublishLogs).toHaveBeenCalledWith(
        expect.objectContaining({ ids: 'log-1' }),
      );
      expect(targets[0]).toMatchObject({
        platformId: 'wechat',
        readCount: 321,
        interactCount: 6,
        platformPublicUrl: 'https://mp.weixin.qq.com/s/x',
      });
      expect(targets[0].statsCheckedAt).toEqual(expect.any(Number));
      expect(targets[1]).toMatchObject({
        platformId: 'zhihu',
        readCount: null,
        interactCount: null,
      });
      expect(targets[1].statsCheckedAt).toBeUndefined();
    });
  });
});
