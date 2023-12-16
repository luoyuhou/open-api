//src/auth/auth.controller.ts

import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthEntity } from './entity/auth.entity';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/password')
  @ApiOkResponse({ type: AuthEntity })
  login(@Body() { phone, password }: LoginDto, @Req() request: Request) {
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];
    return this.authService.loginByPassword(phone, password, { ip, userAgent });
  }
}
