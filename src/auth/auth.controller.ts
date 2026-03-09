//src/auth/auth.controller.ts

import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthEntity } from './entity/auth.entity';
import { Request } from 'express';
import { UserEntity } from '../users/entities/user.entity';
import { CreateUserByPasswordDto } from '../users/dto/create-user.dto';
import { CreateUser_signup_passwordByInputDto } from '../users/dto/create-user_signup_password.dto';
import Utils from '../common/utils';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { LocalScanAuthGuard } from './guards/local-scan.guard';
import { Login_SOURCE_TYPES } from './const';
import { TokenInterceptor } from './interceptors/token.interceptor';
import customLogger from '../common/logger';
import { VerifyCodeDot, WxLoginDto } from './dto/login.dto';
import { WxLocalAuthGuard } from './guards/wx-local-auth.guard';
import { CacheService } from '../common/cache-manager/cache.service';
import {
  ConfirmQrLoginDto,
  QrCodeResponse,
  QrCodeStatusResponse,
  ScanQrCodeDto,
} from './dto/qr-login.dto';
import { SendSmsDto } from './dto/sms.dto';

@Controller('auth')
@ApiTags('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cacheService: CacheService,
  ) {}

  @Post('local/sign-up')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: UserEntity })
  async createWithPassword(
    @Body()
    createUserDto: CreateUserByPasswordDto,
  ) {
    return new UserEntity(
      await this.authService.createUserByPassword(createUserDto),
    );
  }

  @Post('local/sign-in')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(TokenInterceptor)
  @ApiOkResponse({ type: AuthEntity })
  async login(@Req() request: Request) {
    return this.authService.loginUserForWebByPassword(request);
  }

  @Post('wx/verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthEntity })
  async verifyCode(@Req() request: Request, @Body() { code }: VerifyCodeDot) {
    const responses = await this.authService.verifyCode(code);
    return { message: 'ok', data: responses };
  }

  @Post('wx/sign-in')
  @UseGuards(WxLocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(TokenInterceptor)
  @ApiOkResponse({ type: AuthEntity })
  async wxLogin(@Req() request: Request, @Body() wxLoginDto: WxLoginDto) {
    const result = await this.authService.loginByWx(wxLoginDto);
    const user = result.user;
    const openid = result.openid;

    // 🔑 Guard 已经处理了 request.login() 和 session 保存，这里只记录登录历史
    const ip = (request.headers['x-forwarded-host'] as string) || request.ip;
    const useragent = request.headers['user-agent'];
    this.authService.addLoginHistory(
      (user as UserEntity).user_id,
      Login_SOURCE_TYPES.wechat,
      { ip: Utils.formatIp(ip), useragent },
    );

    return { message: 'ok', data: { ...user, openid } };
  }

  @Get('sign-in')
  @UseGuards(SessionAuthGuard)
  @ApiOkResponse({ type: UserEntity })
  async getSignedUser(@Req() request: Request) {
    const user_id = (request.user as UserEntity).user_id;

    console.log('🔍 /auth/sign-in 请求, user_id:', user_id);
    console.log('🔍 Session ID:', request.sessionID);

    const { userAuth, resources } = await this.authService.getCacheResources(
      user_id,
    );

    console.log('🔍 从缓存获取的 userAuth:', userAuth ? '存在' : '不存在');

    // 🔧 修复：没有 userAuth 不应该登出，只是没有特殊权限而已
    // if (!userAuth) {
    //   console.log('❌ 缓存中没有用户资源，执行 logout');
    //   request.logout(() =>
    //     customLogger.log({
    //       message: "Can't get user profile from cache",
    //       user_id,
    //     }),
    //   );
    // } else {
    //   console.log('✅ 成功获取用户资源');
    // }

    if (userAuth) {
      console.log('✅ 用户有特殊权限');
    } else {
      console.log('ℹ️ 用户为普通用户，没有特殊权限');
    }

    return {
      message: 'ok',
      data: request.user,
      resources: userAuth
        ? [{ auth_id: '*', side: 0, path: '*', method: '*' }].concat(
            ...resources,
          )
        : resources,
    };
  }

  @Delete('logout')
  @UseGuards(SessionAuthGuard)
  @ApiOkResponse({})
  async logout(@Req() request: Request) {
    const user_id = (request.user as UserEntity)?.user_id;
    request.logout(() => {
      customLogger.log({ user_id, message: 'success logout' });

      this.cacheService
        .delSessionIdByUserId(user_id)
        .then(() => {
          customLogger.log({
            user_id,
            message: 'success logout by session map',
          });
        })
        .catch((reason) => {
          customLogger.error({
            user_id,
            message: 'failed logout by session map',
            error: reason,
          });
        });
    });
    return { message: 'ok', data: null };
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserEntity })
  async remove(@Param('id') id: string) {
    return new UserEntity(await this.authService.frozen(id));
  }

  @Patch('reactive/:id')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserEntity })
  async reactive(@Param('id') id: string) {
    return new UserEntity(await this.authService.reactive(id));
  }

  @Patch('reset/password/:id')
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserEntity })
  async resetPassword(
    @Param('id') id: string,
    @Body() { password }: CreateUser_signup_passwordByInputDto,
  ) {
    return new UserEntity(
      await this.authService.resetPassword(id, { password }),
    );
  }

  /**
   * 生成扫码登录二维码
   */
  @Post('qr-code/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: QrCodeResponse })
  async generateQrCode() {
    const result = await this.authService.generateQrCode();
    return { message: 'ok', data: result };
  }

  /**
   * 查询二维码状态（前端轮询）
   */
  @Get('qr-code/status/:qrCodeId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalScanAuthGuard)
  @UseInterceptors(TokenInterceptor)
  @ApiOkResponse({ type: QrCodeStatusResponse })
  async checkQrCodeStatus(
    @Req() request: Request,
    @Param('qrCodeId') qrCodeId: string,
  ) {
    // 从 request 中获取结果（由 Guard 设置）
    const result = (request as any).qrCodeResult;

    // 🔑 如果状态不是已确认，直接返回状态信息
    if (result.status !== 'confirmed') {
      return {
        message: 'ok',
        status: result.status,
        remainingTime: result.remainingTime,
      };
    }

    // 如果状态是已确认，用户已由 Guard 登录并保存 session
    const user = request.user as UserEntity;

    if (!user) {
      return {
        message: 'error',
        status: 'expired',
        remainingTime: 0,
      };
    }

    const { resources } = await this.authService.loginUserForWebByScan(
      request,
      user,
    );

    // 返回确认状态和用户信息
    return {
      message: 'ok',
      status: 'confirmed',
      data: user,
      resources,
    };
  }

  /**
   * 小程序扫描二维码（标记为已扫描）
   */
  @Post('qr-code/scan')
  @HttpCode(HttpStatus.OK)
  async scanQrCode(@Body() dto: ScanQrCodeDto) {
    const result = await this.authService.scanQrCode(dto.qrCodeId, dto.openid);
    return { message: 'ok', data: result };
  }

  /**
   * 小程序确认登录
   */
  @Post('qr-code/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmQrLogin(
    @Req() request: Request,
    @Body() dto: ConfirmQrLoginDto,
  ) {
    const result = await this.authService.confirmQrLogin(
      dto.qrCodeId,
      dto.openid,
    );

    return { message: 'ok', data: result };
  }

  @Post('send-sms')
  @HttpCode(HttpStatus.OK)
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    return this.authService.sendSmsCode(sendSmsDto.phone);
  }
}
