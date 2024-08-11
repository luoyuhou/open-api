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
import { Login_SOURCE_TYPES } from './const';
import { TokenInterceptor } from './interceptors/token.interceptor';
import customLogger from '../common/logger';
import { VerifyCodeDot, WxLoginDto } from './dto/login.dto';
import sessionManager from '../common/cache-manager';
import { WxLocalAuthGuard } from './guards/wx-local-auth.guard';

@Controller('auth')
@ApiTags('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    const ip = (request.headers['x-forwarded-host'] as string) || request.ip;
    const useragent = request.headers['user-agent'];
    const { user } = request;
    this.authService.addLoginHistory(
      (user as UserEntity).user_id,
      Login_SOURCE_TYPES.password,
      { ip: Utils.formatIp(ip), useragent },
    );
    const { userAuth, resources } = await this.authService.setCacheResources(
      (user as UserEntity).user_id,
    );
    return {
      message: 'ok',
      data: user,
      resources: userAuth
        ? [{ auth_id: '*', side: 0, path: '*', method: '*' }].concat(
            ...resources,
          )
        : resources,
    };
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
    const user = await this.authService.loginByWx(wxLoginDto);

    request.login(user, () => {
      const ip = (request.headers['x-forwarded-host'] as string) || request.ip;
      const useragent = request.headers['user-agent'];
      this.authService.addLoginHistory(
        (user as UserEntity).user_id,
        Login_SOURCE_TYPES.wechat,
        { ip: Utils.formatIp(ip), useragent },
      );
    });

    return { message: 'ok', data: user };
  }

  @Get('sign-in')
  @UseGuards(SessionAuthGuard)
  @ApiOkResponse({ type: UserEntity })
  async getSignedUser(@Req() request: Request) {
    const user_id = (request.user as UserEntity).user_id;
    const { userAuth, resources } = await this.authService.getCacheResources(
      user_id,
    );

    if (!userAuth) {
      request.logout(() =>
        customLogger.log({
          message: "Can't get user profile from cache",
          user_id,
        }),
      );
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

      sessionManager
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
}
