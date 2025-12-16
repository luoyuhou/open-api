import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { RoleManagementService } from './role-management.service';
import { Pagination } from '../../common/dto/pagination';
import { CreateAuthForRoleManagementDto } from './dto/create-auth-for-role-management.dto';
import { UserEntity } from '../../users/entities/user.entity';
import { UpdateAuthForRoleManagementDto } from './dto/update-auth-for-role-management.dto';
import { UpsertRoleForRoleManagementDto } from './dto/upsert-role-for-role-management.dto';
import { CreateAuthRoleForRoleManagementDto } from './dto/create-authRole-for-role-management.dto';
import { CreateUserRoleForRoleManagementDto } from './dto/create-userRole-for-role-management.dto';
import { UpdateUserRoleForRoleManagementDto } from './dto/update-userRole-for-role-management.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SessionAuthGuard } from '../guards/session-auth.guard';
import { KickOfflineDto } from './dto/online-user.dto';

@UseGuards(SessionAuthGuard)
@Controller('auth/role-management')
@ApiTags('auth/role-management')
export class RoleManagementController {
  constructor(private readonly roleManagementService: RoleManagementService) {}

  /**
   * /auth/auth section
   */
  @Post('auth/pagination')
  async authPagination(@Body() pagination: Pagination) {
    const data = await this.roleManagementService.authPagination(pagination);
    return { message: 'ok', data };
  }

  @Post('auth')
  async createAuth(
    @Req() request: Request,
    @Body() createAuthForRoleManagementDto: CreateAuthForRoleManagementDto,
  ) {
    const data = await this.roleManagementService.createAuth(
      request.user as UserEntity,
      createAuthForRoleManagementDto,
    );
    return { message: 'ok', data };
  }

  @Patch('auth/:id')
  async editAuth(
    @Param('id') id: string,
    @Req() request: Request,
    @Body() updateAuthForRoleManagementDto: UpdateAuthForRoleManagementDto,
  ) {
    const data = await this.roleManagementService.updateAuth(
      id,
      updateAuthForRoleManagementDto,
      request.user as UserEntity,
    );
    return { message: 'ok', data };
  }

  /**
   * /auth/role section
   */
  @Post('role/pagination')
  async rolePagination(@Body() pagination: Pagination) {
    const data = await this.roleManagementService.rolePagination(pagination);
    return { message: 'ok', data };
  }

  @Post('role')
  async createRole(
    @Req() request: Request,
    @Body() createRoleForRoleManagementDto: UpsertRoleForRoleManagementDto,
  ) {
    const role = await this.roleManagementService.createRole(
      createRoleForRoleManagementDto,
      request.user as UserEntity,
    );
    return { message: 'ok', data: role };
  }

  @Patch('role/:id')
  async editRole(
    @Param('id') id: string,
    @Req() request: Request,
    @Body() updateRoleForRoleManagementDto: UpsertRoleForRoleManagementDto,
  ) {
    const role = await this.roleManagementService.updateRole(
      id,
      updateRoleForRoleManagementDto,
      request.user as UserEntity,
    );
    return { message: 'ok', data: role };
  }

  @Delete('role/:id')
  async deleteRole() {
    return { message: 'ok', data: [] };
  }

  /**
   * /auth/auth-role section
   */
  @Post('auth-role/pagination')
  async authRolePagination(@Body() pagination: Pagination) {
    const data = await this.roleManagementService.authRolePagination(
      pagination,
    );
    return { message: 'ok', data };
  }

  @Post('auth-role')
  async createAuthRole(
    @Req() request: Request,
    @Body() createAuthRole: CreateAuthRoleForRoleManagementDto,
  ) {
    const authRole = await this.roleManagementService.createAuthRole(
      createAuthRole,
      request.user as UserEntity,
    );
    return { message: 'ok', data: authRole };
  }

  @Patch('auth-role/:id')
  async editAuthRole(@Param('id') id: string, @Req() request: Request) {
    const authRole = await this.roleManagementService.reactiveAuthRole(
      +id,
      request.user as UserEntity,
    );
    return { message: 'ok', data: authRole };
  }

  @Delete('auth-role/:id')
  async deleteAuthRole(@Param('id') id: string, @Req() request: Request) {
    const authRole = await this.roleManagementService.frozenAuthRole(
      +id,
      request.user as UserEntity,
    );
    return { message: 'ok', data: authRole };
  }

  /**
   * /auth/user-role section
   */
  @Post('user-role/pagination')
  async userRolePagination(@Body() pagination: Pagination) {
    const data = await this.roleManagementService.userRolePagination(
      pagination,
    );
    return { message: 'ok', data };
  }

  @Post('user-role')
  async createUserRole(
    @Req() request: Request,
    @Body() createUserRole: CreateUserRoleForRoleManagementDto,
  ) {
    const userRole = await this.roleManagementService.createUserRole(
      createUserRole,
      request.user as UserEntity,
    );
    return { message: 'ok', data: userRole };
  }

  @Patch('user-role/:id')
  async editUserRole(
    @Param('id') id: string,
    @Req() request: Request,
    @Body() updateUserRole: UpdateUserRoleForRoleManagementDto,
  ) {
    const userRole = await this.roleManagementService.updateUserRole(
      +id,
      updateUserRole,
      request.user as UserEntity,
    );
    return { message: 'ok', data: [] };
  }

  @Delete('user-role/:id')
  async deleteUserRole() {
    return { message: 'ok', data: [] };
  }

  /**
   * 在线用户管理 section
   */
  @Post('online-users/pagination')
  @ApiOperation({ summary: '获取在线用户列表（分页）' })
  async getOnlineUsersPagination(@Body() pagination: Pagination) {
    const data = await this.roleManagementService.getOnlineUsersPagination(
      pagination,
    );
    return { message: 'ok', data };
  }

  @Delete('online-users/kick-offline/:user_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '踢用户下线（DELETE方式）' })
  async kickUserOffline(@Param('user_id') user_id: string) {
    const data = await this.roleManagementService.kickUserOffline(user_id);
    return { message: 'ok', data };
  }
}
