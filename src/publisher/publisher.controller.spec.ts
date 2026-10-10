import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { PublisherController } from './publisher.controller';
import { PublisherService } from './publisher.service';
import { UserEntity } from '../users/entities/user.entity';

describe('PublisherController (platform catalog)', () => {
  let controller: PublisherController;
  let publisherService: jest.Mocked<
    Pick<
      PublisherService,
      | 'listPlatforms'
      | 'listAdminPlatforms'
      | 'createAdminPlatform'
      | 'updateAdminPlatform'
    >
  >;

  const admin = { user_id: 'admin-1' } as UserEntity;
  const req = { user: admin } as unknown as Request;

  beforeEach(async () => {
    publisherService = {
      listPlatforms: jest.fn(),
      listAdminPlatforms: jest.fn(),
      createAdminPlatform: jest.fn(),
      updateAdminPlatform: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublisherController],
      providers: [{ provide: PublisherService, useValue: publisherService }],
    }).compile();

    controller = module.get(PublisherController);
  });

  it('listPlatforms 应包装 service 结果', async () => {
    const platforms = [{ id: 'wechat', name: '微信公众号', enabled: true }];
    publisherService.listPlatforms.mockResolvedValue(platforms as any);

    const result = await controller.listPlatforms();

    expect(publisherService.listPlatforms).toHaveBeenCalled();
    expect(result).toEqual({ message: 'ok', data: platforms });
  });

  it('listAdminPlatforms 应传入当前用户', async () => {
    const platforms = [
      { id: 'wechat', enabled: true },
      { id: 'youtube', enabled: false },
    ];
    publisherService.listAdminPlatforms.mockResolvedValue(platforms as any);

    const result = await controller.listAdminPlatforms(req);

    expect(publisherService.listAdminPlatforms).toHaveBeenCalledWith(admin);
    expect(result).toEqual({ message: 'ok', data: platforms });
  });

  it('createAdminPlatform 应转发 dto', async () => {
    const dto = { platformId: 'custom', name: '自建' };
    const created = { id: 'custom', name: '自建', enabled: true };
    publisherService.createAdminPlatform.mockResolvedValue(created as any);

    const result = await controller.createAdminPlatform(req, dto as any);

    expect(publisherService.createAdminPlatform).toHaveBeenCalledWith(
      admin,
      dto,
    );
    expect(result).toEqual({ message: 'ok', data: created });
  });

  it('updateAdminPlatform 应转发 id 与 dto', async () => {
    const dto = { enabled: false };
    const updated = { id: 'wechat', enabled: false };
    publisherService.updateAdminPlatform.mockResolvedValue(updated as any);

    const result = await controller.updateAdminPlatform(req, 'wechat', dto);

    expect(publisherService.updateAdminPlatform).toHaveBeenCalledWith(
      admin,
      'wechat',
      dto,
    );
    expect(result).toEqual({ message: 'ok', data: updated });
  });
});
