import { Controller, Post, Body, Get, Req } from '@nestjs/common';
import { UsersFetchService } from './users-fetch.service';
import { Pagination } from '../../common/dto/pagination';
import { Request } from 'express';
import { UserEntity } from '../entities/user.entity';

@Controller('/users')
export class UsersFetchController {
  constructor(private readonly usersFetchService: UsersFetchService) {}

  @Get('users-fetch/realtime')
  async realtime(@Req() req: Request) {
    const { user_id } = (req as unknown as UserEntity) ?? {};
    const list = await this.usersFetchService.realtime(user_id);
    return { data: list };
  }

  @Post('users-fetch/pagination')
  async fetchPagination(@Body() pagination: Pagination) {
    return this.usersFetchService.fetchPagination(pagination);
  }

  @Post('users-login/pagination')
  async loginPagination(@Body() pagination: Pagination) {
    return this.usersFetchService.loginPagination(pagination);
  }
}
