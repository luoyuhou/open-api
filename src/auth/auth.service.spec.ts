import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { CreateUserByPasswordDto } from '../users/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { RoleManagementService } from './role-management/role-management.service';
import { UsersService } from '../users/users.service';
import { CacheService } from '../common/cache-manager/cache.service';
import { SmsService } from '../common/sms/sms.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let cacheService: CacheService;
  let usersService: UsersService;
  let smsService: SmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        CacheService,
        UsersService,
        PrismaService,
        JwtService,
        RoleManagementService,
        {
          provide: SmsService,
          useValue: {
            sendVerificationCode: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
    usersService = module.get<UsersService>(UsersService);
    smsService = module.get<SmsService>(SmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUserByPassword and loginByPassword', () => {
    it('Create User | Login by password', async () => {
      const password = Math.random().toString().slice(2, 15);
      const userInfo: CreateUserByPasswordDto = {
        first_name: password.slice(0, 5),
        last_name: password.slice(5, 10),
        phone: password,
        code: password.slice(-6),
        password,
      };

      const user = await service.createUserByPassword(userInfo);
      expect(user?.phone).toBe(password);

      const loginUserByPassword = await service.loginByPassword(
        password,
        password,
      );
      expect(loginUserByPassword?.phone).toBe(password);
    }, 10000);
  });

  describe('generateForgetPasswordSmsToken', () => {
    it('should generate token for existing phone', async () => {
      const phone = '13800138000';
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        user_id: 'user123',
        phone,
      } as any);

      const result = await service.generateForgetPasswordSmsToken(phone);

      expect(result).toHaveProperty('token');
      expect(result.token).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should throw error for non-existing phone', async () => {
      const phone = '13800138000';
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.generateForgetPasswordSmsToken(phone),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid phone format', async () => {
      const phone = '123';

      await expect(
        service.generateForgetPasswordSmsToken(phone),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendForgetPasswordSms', () => {
    it('should send SMS successfully', async () => {
      const phone = '13800138000';
      const token = 'test-token';
      const ip = '127.0.0.1';

      // Mock cache service - 第一次 get 返回 token 验证通过，第二次返回 null（不在冷却期）
      jest
        .spyOn(cacheService.client, 'get')
        .mockResolvedValueOnce('1') // token validation
        .mockResolvedValueOnce(null) // cooldown check
        .mockResolvedValueOnce(null) // daily limit check
        .mockResolvedValueOnce(null); // ip limit check
      jest.spyOn(cacheService.client, 'del').mockResolvedValue(1);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        user_id: 'user123',
        phone,
      } as any);
      jest.spyOn(smsService, 'sendVerificationCode').mockResolvedValue(true);
      jest.spyOn(cacheService.client, 'pipeline').mockReturnValue({
        set: jest.fn().mockReturnThis(),
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.sendForgetPasswordSms(phone, token, ip);

      expect(result).toEqual({ message: '验证码已发送' });
    });

    it('should throw error when token is invalid', async () => {
      const phone = '13800138000';
      const token = 'invalid-token';

      jest.spyOn(cacheService.client, 'get').mockResolvedValue(null);

      await expect(service.sendForgetPasswordSms(phone, token)).rejects.toThrow(
        '滑块校验失败或已过期，请重试',
      );
    });

    it('should throw error when in cooldown period', async () => {
      const phone = '13800138000';
      const token = 'test-token';

      jest
        .spyOn(cacheService.client, 'get')
        .mockResolvedValueOnce('1') // token validation
        .mockResolvedValueOnce('1'); // cooldown check
      jest.spyOn(cacheService.client, 'del').mockResolvedValue(1);
      jest.spyOn(cacheService.client, 'ttl').mockResolvedValue(30);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        user_id: 'user123',
        phone,
      } as any);

      await expect(service.sendForgetPasswordSms(phone, token)).rejects.toThrow(
        '请求过于频繁',
      );
    });
  });

  describe('resetPasswordByPhone', () => {
    it('should reset password successfully', async () => {
      const phone = '13800138000';
      const code = '123456';
      const password = 'newPassword123';

      jest.spyOn(service, 'verifySmsCode').mockResolvedValue(true);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        user_id: 'user123',
        phone,
      } as any);
      jest.spyOn(usersService, 'resetPassword').mockResolvedValue({} as any);

      const result = await service.resetPasswordByPhone(phone, code, password);

      expect(result).toEqual({ message: '密码重置成功' });
    });

    it('should throw error when user not found', async () => {
      const phone = '13800138000';
      const code = '123456';
      const password = 'newPassword123';

      jest.spyOn(service, 'verifySmsCode').mockResolvedValue(true);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.resetPasswordByPhone(phone, code, password),
      ).rejects.toThrow('该手机号未注册');
    });
  });

  describe('verifySmsCode', () => {
    it('should verify valid SMS code', async () => {
      const phone = '13800138000';
      const code = '123456';

      jest.spyOn(cacheService.client, 'get').mockResolvedValue(code);
      jest.spyOn(cacheService.client, 'del').mockResolvedValue(1);

      const result = await service.verifySmsCode(phone, code);

      expect(result).toBe(true);
    });

    it('should throw error for expired code', async () => {
      const phone = '13800138000';
      const code = '123456';

      jest.spyOn(cacheService.client, 'get').mockResolvedValue(null);

      await expect(service.verifySmsCode(phone, code)).rejects.toThrow(
        '验证码已过期或不存在',
      );
    });

    it('should throw error for wrong code', async () => {
      const phone = '13800138000';
      const code = '123456';
      const cachedCode = '654321';

      jest.spyOn(cacheService.client, 'get').mockResolvedValue(cachedCode);

      await expect(service.verifySmsCode(phone, code)).rejects.toThrow(
        '验证码错误',
      );
    });
  });
});
