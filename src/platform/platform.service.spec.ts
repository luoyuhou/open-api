import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  FREE_MEMBERS_PER_STORE,
  FREE_STORES_PER_USER,
  PLATFORM_CODE_STATUS,
  PLATFORM_ORDER_STATUS,
  PLATFORM_ORDER_TYPE,
} from './platform.const';
import { UserEntity } from '../users/entities/user.entity';

describe('PlatformService', () => {
  let service: PlatformService;
  let prisma: PrismaService;

  const user = {
    user_id: 'user-1',
    phone: '13800000001',
  } as UserEntity;

  const admin = { user_id: 'admin-1' } as UserEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformService,
        {
          provide: PrismaService,
          useValue: {
            store: {
              count: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            store_member: {
              count: jest.fn(),
            },
            platform_quota_order: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
            platform_activation_code: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            platform_setting: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
            },
            $transaction: jest.fn((ops) => Promise.all(ops)),
          },
        },
      ],
    }).compile();

    service = module.get<PlatformService>(PlatformService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getStoreQuotaCheck', () => {
    it('首店免费，第二店起需要验证码', async () => {
      (prisma.store.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getStoreQuotaCheck(user);

      expect(result).toEqual({
        storeCount: 1,
        freeLimit: FREE_STORES_PER_USER,
        needsCode: true,
      });
    });
  });

  describe('getMemberQuotaInfo', () => {
    it('应计算会员配额与是否达上限', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        store_id: 's1',
        extra_member_limit: 10,
      });
      (prisma.store_member.count as jest.Mock).mockResolvedValue(20);

      const result = await service.getMemberQuotaInfo('s1');

      expect(result.totalLimit).toBe(FREE_MEMBERS_PER_STORE + 10);
      expect(result.atLimit).toBe(true);
      expect(result.quotaOptions).toHaveLength(3);
    });

    it('店铺不存在时抛出 NotFoundException', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMemberQuotaInfo('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createQuotaOrder', () => {
    it('应创建会员扩容订单', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        store_id: 's1',
      });
      (prisma.platform_quota_order.create as jest.Mock).mockResolvedValue({
        order_id: 'pqo-1',
        amount: 100,
        status: PLATFORM_ORDER_STATUS.PENDING,
      });

      const result = await service.createQuotaOrder(user, {
        order_type: PLATFORM_ORDER_TYPE.MEMBER_QUOTA,
        store_id: 's1',
        quota_amount: 10,
      });

      expect(prisma.platform_quota_order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order_type: PLATFORM_ORDER_TYPE.MEMBER_QUOTA,
            store_id: 's1',
            quota_amount: 10,
            amount: 100,
            phone: user.phone,
          }),
        }),
      );
      expect(result.order_id).toBe('pqo-1');
    });

    it('无需购买门店码时不允许下单', async () => {
      (prisma.store.count as jest.Mock).mockResolvedValue(0);

      await expect(
        service.createQuotaOrder(user, {
          order_type: PLATFORM_ORDER_TYPE.STORE_CREATE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('未绑定手机号时不允许下单', async () => {
      await expect(
        service.createQuotaOrder(
          { user_id: 'u2', phone: 'tmp123' } as UserEntity,
          {
            order_type: PLATFORM_ORDER_TYPE.MEMBER_QUOTA,
            store_id: 's1',
            quota_amount: 10,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmOrder', () => {
    it('确认待处理订单并生成激活码', async () => {
      (prisma.platform_quota_order.findUnique as jest.Mock).mockResolvedValue({
        order_id: 'pqo-1',
        status: PLATFORM_ORDER_STATUS.PENDING,
        order_type: PLATFORM_ORDER_TYPE.MEMBER_QUOTA,
        phone: user.phone,
        user_id: user.user_id,
        store_id: 's1',
        quota_amount: 10,
      });
      (
        prisma.platform_activation_code.findFirst as jest.Mock
      ).mockResolvedValue(null);
      (
        prisma.platform_activation_code.findUnique as jest.Mock
      ).mockResolvedValue(null);
      (prisma.platform_quota_order.update as jest.Mock).mockResolvedValue({
        order_id: 'pqo-1',
        status: PLATFORM_ORDER_STATUS.CONFIRMED,
      });
      (prisma.platform_activation_code.create as jest.Mock).mockResolvedValue({
        code: 'ABCD1234',
        order_id: 'pqo-1',
      });

      const result = await service.confirmOrder('pqo-1', admin);

      expect(prisma.platform_activation_code.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order_id: 'pqo-1',
            bound_phone: user.phone,
            code_type: PLATFORM_ORDER_TYPE.MEMBER_QUOTA,
            status: PLATFORM_CODE_STATUS.UNUSED,
          }),
        }),
      );
      expect(result.activationCode.code).toBe('ABCD1234');
    });
  });

  describe('redeemStoreCreateCode', () => {
    it('核销门店创建码并关联使用门店', async () => {
      const record = {
        code: 'STORE123',
        status: PLATFORM_CODE_STATUS.UNUSED,
        code_type: PLATFORM_ORDER_TYPE.STORE_CREATE,
        bound_phone: user.phone,
      };
      (
        prisma.platform_activation_code.findUnique as jest.Mock
      ).mockResolvedValue(record);
      (prisma.platform_activation_code.update as jest.Mock).mockResolvedValue(
        {},
      );

      await service.redeemStoreCreateCode(user, 'store123', 'store-new-1');

      expect(prisma.platform_activation_code.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: 'STORE123' },
          data: expect.objectContaining({
            status: PLATFORM_CODE_STATUS.USED,
            used_store_id: 'store-new-1',
          }),
        }),
      );
    });
  });

  describe('validateCode', () => {
    it('手机号不匹配时应拒绝', async () => {
      (
        prisma.platform_activation_code.findUnique as jest.Mock
      ).mockResolvedValue({
        code: 'CODE1',
        status: PLATFORM_CODE_STATUS.UNUSED,
        code_type: PLATFORM_ORDER_TYPE.STORE_CREATE,
        bound_phone: '13900000000',
      });

      await expect(
        service.validateCode(user, {
          code: 'code1',
          code_type: PLATFORM_ORDER_TYPE.STORE_CREATE,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDutyUserIds / updateDutyUserIds', () => {
    it('应读取并更新值班用户配置', async () => {
      (prisma.platform_setting.findUnique as jest.Mock).mockResolvedValue({
        setting_value: 'u1,u2',
      });
      (prisma.platform_setting.upsert as jest.Mock).mockResolvedValue({});

      await expect(service.getDutyUserIds()).resolves.toEqual(['u1', 'u2']);
      await expect(service.updateDutyUserIds(['u1', 'u3'])).resolves.toEqual({
        user_ids: ['u1', 'u3'],
      });
    });
  });
});
