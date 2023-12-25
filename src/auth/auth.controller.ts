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
  Res,
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
import { LoginDto } from './dto/login.dto';
import { Request, Response } from 'express';
import { UserEntity } from '../users/entities/user.entity';
import { CreateUserByPasswordDto } from '../users/dto/create-user.dto';
import { CreateUser_signup_passwordByInputDto } from '../users/dto/create-user_signup_password.dto';
import Utils from '../common/utils';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { Login_SOURCE_TYPES } from './const';
import { TokenInterceptor } from './interceptors/token.interceptor';

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
  async login(
    @Body() { phone, password }: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ip = request.ip;
    const useragent = request.headers['user-agent'];
    const { user } = request;
    console.log('user', user);
    this.authService.addLoginHistory(
      (user as UserEntity).user_id,
      Login_SOURCE_TYPES.password,
      { ip: Utils.formatIp(ip), useragent },
    );
    // response.cookie('sid.token', token, { httpOnly: true });
    return { message: 'ok' };
  }

  @Get('sign-in')
  @UseGuards(SessionAuthGuard)
  @ApiOkResponse({ type: UserEntity })
  async getSignedUser() {
    return {};
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
