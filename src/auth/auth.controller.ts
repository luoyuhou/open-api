//src/auth/auth.controller.ts

import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
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
import { Request } from 'express';
import { UserEntity } from '../users/entities/user.entity';
import { CreateUserByInputDto } from '../users/dto/create-user.dto';
import { CreateUser_signin_passwordByInputDto } from '../users/dto/create-user_signin_password.dto';
import { Public } from '../common/public.decorator';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('sign-up/password')
  @ApiCreatedResponse({ type: UserEntity })
  async createWithPassword(
    @Body()
    createUserDto: CreateUserByInputDto & CreateUser_signin_passwordByInputDto,
  ) {
    return new UserEntity(
      await this.authService.createUserByPassword(createUserDto),
    );
  }

  @Public()
  @Post('login/password')
  @ApiOkResponse({ type: AuthEntity })
  login(@Body() { phone, password }: LoginDto, @Req() request: Request) {
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];
    return this.authService.loginByPassword(phone, password, { ip, userAgent });
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserEntity })
  async remove(@Param('id', ParseIntPipe) id: string) {
    return new UserEntity(await this.authService.frozen(id));
  }

  @Patch('/reactive/:id')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserEntity })
  async reactive(@Param('id', ParseIntPipe) id: string) {
    return new UserEntity(await this.authService.reactive(id));
  }
}
