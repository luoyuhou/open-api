import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RoleManagementService } from './role-management.service';
import { CreateRoleManagementDto } from './dto/create-role-management.dto';
import { UpdateRoleManagementDto } from './dto/update-role-management.dto';

@Controller('role-management')
export class RoleManagementController {
  constructor(private readonly roleManagementService: RoleManagementService) {}

  /**
   * /auth/auth section
   */
  @Post('auth/pagination')
  async authPagination() {
    const data = [];
    return { message: 'ok', data };
  }

  @Post('auth')
  async createAuth() {
    return { message: 'ok', data: [] };
  }

  @Patch('auth/:id')
  async editAuth() {
    return { message: 'ok', data: [] };
  }

  @Delete('auth/:id')
  async deleteAuth() {
    return { message: 'ok', data: [] };
  }

  /**
   * /auth/role section
   */
  @Post('role/pagination')
  async rolePagination() {
    const data = [];
    return { message: 'ok', data };
  }

  @Post('role')
  async createRole() {
    return { message: 'ok', data: [] };
  }

  @Patch('role/:id')
  async editRole() {
    return { message: 'ok', data: [] };
  }

  @Delete('role/:id')
  async deleteRole() {
    return { message: 'ok', data: [] };
  }

  /**
   * /auth/auth-role section
   */
  @Post('auth-role')
  async createAuthRole() {
    return { message: 'ok', data: [] };
  }

  @Patch('auth-role/:id')
  async editAuthRole() {
    return { message: 'ok', data: [] };
  }

  @Delete('auth-role/:id')
  async deleteAuthRole() {
    return { message: 'ok', data: [] };
  }

  /**
   * /auth/user-role section
   */
  @Post('user-role')
  async createUserRole() {
    return { message: 'ok', data: [] };
  }

  @Patch('user-role/:id')
  async editUserRole() {
    return { message: 'ok', data: [] };
  }

  @Delete('user-role/:id')
  async deleteUserRole() {
    return { message: 'ok', data: [] };
  }
}
