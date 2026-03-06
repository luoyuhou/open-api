import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CacheService } from '../common/cache-manager/cache.service';
import { Request } from 'express';
import { UserEntity } from '../users/entities/user.entity';
import { CreateUserByPasswordDto } from '../users/dto/create-user.dto';
import { CreateUser_signup_passwordByInputDto } from '../users/dto/create-user_signup_password.dto';
import { VerifyCodeDot, WxLoginDto } from './dto/login.dto';
import {
  ConfirmQrLoginDto,
  QrCodeResponse,
  ScanQrCodeDto,
} from './dto/qr-login.dto';
import { Login_SOURCE_TYPES } from './const';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;
  let cacheService: any;

  beforeEach(async () => {
    const mockAuthService = {
      createUserByPassword: jest.fn(),
      loginUserForWebByPassword: jest.fn(),
      verifyCode: jest.fn(),
      loginByWx: jest.fn(),
      addLoginHistory: jest.fn(),
      getCacheResources: jest.fn(),
      frozen: jest.fn(),
      reactive: jest.fn(),
      resetPassword: jest.fn(),
      generateQrCode: jest.fn(),
      scanQrCode: jest.fn(),
      confirmQrLogin: jest.fn(),
      loginUserForWebByScan: jest.fn(),
    };

    const mockCacheService = {
      delSessionIdByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createWithPassword', () => {
    it('should create user with password and return UserEntity', async () => {
      const createUserDto: CreateUserByPasswordDto = {
        phone: '12345678901',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      };
      const mockUser = { user_id: 'user123', phone: '12345678901' };
      authService.createUserByPassword.mockResolvedValue(mockUser as any);

      const result = await controller.createWithPassword(createUserDto);

      expect(authService.createUserByPassword).toHaveBeenCalledWith(
        createUserDto,
      );
      expect(result).toBeInstanceOf(UserEntity);
      expect(result.user_id).toBe('user123');
    });
  });

  describe('login', () => {
    it('should login user with local auth', async () => {
      const mockRequest = {
        user: { user_id: 'user123' },
      } as unknown as Request;
      const mockAuthEntity = { accessToken: 'token123' };
      authService.loginUserForWebByPassword.mockResolvedValue(
        mockAuthEntity as any,
      );

      const result = await controller.login(mockRequest);

      expect(authService.loginUserForWebByPassword).toHaveBeenCalledWith(
        mockRequest,
      );
      expect(result).toEqual(mockAuthEntity);
    });
  });

  describe('verifyCode', () => {
    it('should verify code and return response', async () => {
      const mockRequest = {} as Request;
      const verifyCodeDot: VerifyCodeDot = { code: '123456' };
      const mockResponse = { success: true };
      authService.verifyCode.mockResolvedValue(mockResponse as any);

      const result = await controller.verifyCode(mockRequest, verifyCodeDot);

      expect(authService.verifyCode).toHaveBeenCalledWith('123456');
      expect(result).toEqual({ message: 'ok', data: mockResponse });
    });
  });

  describe('wxLogin', () => {
    it('should login via wechat and return user data', async () => {
      const mockRequest = {
        headers: { 'x-forwarded-host': '127.0.0.1', 'user-agent': 'test' },
        ip: '127.0.0.1',
      } as unknown as Request;
      const wxLoginDto: WxLoginDto = {
        uuid: 'uuid',
        signature: '123',
        rawData: '',
      };
      const mockResult = {
        user: { user_id: 'user123', phone: '12345678901' },
        openid: 'openid123',
      };
      authService.loginByWx.mockResolvedValue(mockResult as any);
      authService.addLoginHistory.mockResolvedValue({} as never);

      const result = await controller.wxLogin(mockRequest, wxLoginDto);

      expect(authService.loginByWx).toHaveBeenCalledWith(wxLoginDto);
      expect(authService.addLoginHistory).toHaveBeenCalledWith(
        'user123',
        Login_SOURCE_TYPES.wechat,
        { ip: '127.0.0.1', useragent: 'test' },
      );
      expect(result).toEqual({
        message: 'ok',
        data: { ...mockResult.user, openid: 'openid123' },
      });
    });
  });

  describe('getSignedUser', () => {
    it('should return signed user with resources', async () => {
      const mockRequest = {
        user: { user_id: 'user123' },
      } as unknown as Request;
      const mockResources = [
        { auth_id: 'auth1', side: 0, path: '/test', method: 'GET' },
      ];
      const mockUserAuth: UserEntity = new UserEntity({ id: 1 });
      authService.getCacheResources.mockResolvedValue({
        userAuth: mockUserAuth,
        resources: mockResources,
      });

      const result = await controller.getSignedUser(mockRequest);

      expect(authService.getCacheResources).toHaveBeenCalledWith('user123');
      expect(result).toEqual({
        message: 'ok',
        data: mockRequest.user,
        resources: [
          { auth_id: '*', side: 0, path: '*', method: '*' },
          ...mockResources,
        ],
      });
    });

    it('should return signed user without special auth', async () => {
      const mockRequest = {
        user: { user_id: 'user123' },
      } as unknown as Request;
      const mockResources = [
        { auth_id: 'auth1', side: 0, path: '/test', method: 'GET' },
      ];
      authService.getCacheResources.mockResolvedValue({
        userAuth: null,
        resources: mockResources,
      });

      const result = await controller.getSignedUser(mockRequest);

      expect(result.resources).toEqual(mockResources);
    });
  });

  describe('logout', () => {
    it('should logout user and clear session mapping', async () => {
      const mockRequest = {
        user: { user_id: 'user123' },
        logout: jest.fn((callback) => callback()),
      } as unknown as Request;
      cacheService.delSessionIdByUserId.mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest);

      expect(mockRequest.logout).toHaveBeenCalled();
      expect(cacheService.delSessionIdByUserId).toHaveBeenCalledWith('user123');
      expect(result).toEqual({ message: 'ok', data: null });
    });
  });

  describe('remove', () => {
    it('should freeze user', async () => {
      const mockUser = { user_id: 'user123' };
      authService.frozen.mockResolvedValue(mockUser as any);

      const result = await controller.remove('user123');

      expect(authService.frozen).toHaveBeenCalledWith('user123');
      expect(result).toBeInstanceOf(UserEntity);
    });
  });

  describe('reactive', () => {
    it('should reactive user', async () => {
      const mockUser = { user_id: 'user123' };
      authService.reactive.mockResolvedValue(mockUser as any);

      const result = await controller.reactive('user123');

      expect(authService.reactive).toHaveBeenCalledWith('user123');
      expect(result).toBeInstanceOf(UserEntity);
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      const mockUser = { user_id: 'user123' };
      const passwordDto: CreateUser_signup_passwordByInputDto = {
        password: 'newpass',
      };
      authService.resetPassword.mockResolvedValue(mockUser as any);

      const result = await controller.resetPassword('user123', passwordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith('user123', {
        password: 'newpass',
      });
      expect(result).toBeInstanceOf(UserEntity);
    });
  });

  describe('generateQrCode', () => {
    it('should generate QR code', async () => {
      const mockQrCode: QrCodeResponse = {
        qrCodeId: 'qr123',
        qrCodeContent: 'content',
        expiresIn: 10,
      };
      authService.generateQrCode.mockResolvedValue(mockQrCode);

      const result = await controller.generateQrCode();

      expect(authService.generateQrCode).toHaveBeenCalled();
      expect(result).toEqual({ message: 'ok', data: mockQrCode });
    });
  });

  describe('checkQrCodeStatus', () => {
    it('should return status when not confirmed', async () => {
      const mockRequest = {
        qrCodeResult: { status: 'pending', remainingTime: 300 },
      } as any;
      const result = await controller.checkQrCodeStatus(mockRequest, 'qr123');

      expect(result).toEqual({
        message: 'ok',
        status: 'pending',
        remainingTime: 300,
      });
    });

    it('should return confirmed status with user info', async () => {
      const mockUser = { user_id: 'user123' };
      const mockRequest = {
        qrCodeResult: { status: 'confirmed' },
        user: mockUser,
      } as any;
      const mockResources = [{ auth_id: 'auth1' }];
      authService.loginUserForWebByScan.mockResolvedValue({
        resources: mockResources,
      } as any);

      const result = await controller.checkQrCodeStatus(mockRequest, 'qr123');

      expect(authService.loginUserForWebByScan).toHaveBeenCalledWith(
        mockRequest,
        mockUser,
      );
      expect(result).toEqual({
        message: 'ok',
        status: 'confirmed',
        data: mockUser,
        resources: mockResources,
      });
    });

    it('should return expired when user missing', async () => {
      const mockRequest = {
        qrCodeResult: { status: 'confirmed' },
        user: null,
      } as any;
      const result = await controller.checkQrCodeStatus(mockRequest, 'qr123');

      expect(result).toEqual({
        message: 'error',
        status: 'expired',
        remainingTime: 0,
      });
    });
  });

  describe('scanQrCode', () => {
    it('should scan QR code', async () => {
      const dto: ScanQrCodeDto = { qrCodeId: 'qr123', openid: 'openid123' };
      const mockResult = { message: 'ok' };
      authService.scanQrCode.mockResolvedValue(mockResult);

      const result = await controller.scanQrCode(dto);

      expect(authService.scanQrCode).toHaveBeenCalledWith('qr123', 'openid123');
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });

  describe('confirmQrLogin', () => {
    it('should confirm QR login', async () => {
      const dto: ConfirmQrLoginDto = { qrCodeId: 'qr123', openid: 'openid123' };
      const mockResult = {
        message: 'ok',
        user: new UserEntity({
          id: 2,
          user_id: 'user_qr_login',
          first_name: 'qr',
          last_name: 'login',
        }),
      };
      authService.confirmQrLogin.mockResolvedValue(mockResult);

      const result = await controller.confirmQrLogin({} as Request, dto);

      expect(authService.confirmQrLogin).toHaveBeenCalledWith(
        'qr123',
        'openid123',
      );
      expect(result).toEqual({ message: 'ok', data: mockResult });
    });
  });
});
