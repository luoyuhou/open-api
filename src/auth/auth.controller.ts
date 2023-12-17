//src/auth/auth.controller.ts

import {
  Body,
  Controller,
  Delete,
  Param,
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
import { CreateUserByPasswordDto } from '../users/dto/create-user.dto';
import { Public } from '../common/public.decorator';
import { CreateUser_signup_passwordByInputDto } from '../users/dto/create-user_signup_password.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('sign-up/password')
  @ApiCreatedResponse({ type: UserEntity })
  async createWithPassword(
    @Body()
    createUserDto: CreateUserByPasswordDto,
  ) {
    return new UserEntity(
      await this.authService.createUserByPassword(createUserDto),
    );
  }

  @Public()
  @Post('sign-in/password')
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
