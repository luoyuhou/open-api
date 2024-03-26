import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserEntity } from '../../users/entities/user.entity';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuthForRoleManagementDto } from './dto/create-auth-for-role-management.dto';
import { v4 } from 'uuid';
import {
  EAUTH_ROLE_STATUS,
  EAUTH_SIDE_CODE,
  EAUTH_STATUS,
  EUSER_ROLE_STATUS,
} from './const';
import { UpdateAuthForRoleManagementDto } from './dto/update-auth-for-role-management.dto';
import { Pagination } from '../../common/dto/pagination';
import { UpsertRoleForRoleManagementDto } from './dto/upsert-role-for-role-management.dto';
import { CreateAuthRoleForRoleManagementDto } from './dto/create-authRole-for-role-management.dto';
import { CreateUserRoleForRoleManagementDto } from './dto/create-userRole-for-role-management.dto';
import { UpdateUserRoleForRoleManagementDto } from './dto/update-userRole-for-role-management.dto';

@Injectable()
export class RoleManagementService {
  constructor(private prisma: PrismaService) {}

  private generateAuthId() {
    return `auth-${v4()}`;
  }

  public async findAndFailAuthByAuthId(auth_id: string) {
    const auth = await this.prisma.auth.findUnique({ where: { auth_id } });
    if (!auth) {
      throw new BadRequestException(`The auth_id <${auth_id}> not exist!`);
    }

    return auth;
  }

  public async findAndFailActiveAuthByAuthId(auth_id: string) {
    const auth = await this.findAndFailAuthByAuthId(auth_id);

    if (auth.status === EAUTH_STATUS.inactive) {
      throw new BadRequestException(
        `The <${auth.path}> has been inacitve on ${this.sideCodeTranslateToWord(
          auth.side,
        )}`,
      );
    }

    return auth;
  }

  public sideCodeTranslateToWord(code: number) {
    if (code === EAUTH_SIDE_CODE.api) {
      return 'API';
    }

    if (code === EAUTH_SIDE_CODE.web) {
      return 'Web';
    }

    return 'Unknown';
  }

  public async createAuth(
    user: UserEntity,
    createAuthForRoleManagementDto: CreateAuthForRoleManagementDto,
  ) {
    const { side, path, method } = createAuthForRoleManagementDto;
    const auth = await this.prisma.auth.findFirst({
      where: { side, path, method },
    });

    if (auth) {
      throw new BadRequestException(
        `The <${path}> existed on ${this.sideCodeTranslateToWord(side)}`,
      );
    }

    return this.prisma.auth.create({
      data: {
        auth_id: this.generateAuthId(),
        status: EAUTH_STATUS.active,
        ...createAuthForRoleManagementDto,
      },
    });
  }

  public async updateAuth(
    auth_id: string,
    updateAuthForRoleManagementDto: UpdateAuthForRoleManagementDto,
    user: UserEntity,
  ) {
    await this.findAndFailAuthByAuthId(auth_id);

    const { side, path } = updateAuthForRoleManagementDto;
    const newAuth = await this.prisma.auth.findFirst({ where: { side, path } });
    if (newAuth && newAuth.auth_id !== auth_id) {
      throw new BadRequestException(
        `The <${path}> existed on ${this.sideCodeTranslateToWord(side)}`,
      );
    }

    return this.prisma.auth.update({
      where: { auth_id },
      data: updateAuthForRoleManagementDto,
    });
  }

  public async authPagination(pagination: Pagination) {
    const { pageNum, pageSize, sorted, filtered } = pagination;
    const where = {};
    filtered.forEach(({ id, value }) => {
      if (Array.isArray(value)) {
        where[id] = { in: value };
        return;
      }

      where[id] = value;
    });

    const orderByKey =
      Array.isArray(sorted) && sorted.length ? sorted[0].id : 'create_date';
    const orderByValue =
      Array.isArray(sorted) && sorted.length
        ? sorted[0].desc
          ? 'desc'
          : 'acs'
        : 'desc';
    const count = await this.prisma.auth.count({
      where: where,
    });
    const data = await this.prisma.auth.findMany({
      where: where,
      take: pageSize,
      skip: pageNum * pageSize,
      orderBy: { [orderByKey]: orderByValue },
    });

    return {
      data,
      rows: count,
      pages: Math.ceil(count / pageSize),
    };
  }

  /**
   * role section
   */
  private generateRoleId() {
    return `role-${v4()}`;
  }

  public async findAndFailRoleByRoleId(role_id: string) {
    const role = await this.prisma.role.findUnique({ where: { role_id } });

    if (!role) {
      throw new NotFoundException(`Can't find role by ${role_id}`);
    }

    return role;
  }

  public async exitedAndFailRoleByRoleName(role_name: string) {
    const role = await this.prisma.role.findUnique({ where: { role_name } });

    if (role) {
      throw new BadRequestException(`The role ${role_name} has been existed`);
    }
  }

  public async rolePagination(pagination: Pagination) {
    const { pageNum, pageSize, sorted, filtered } = pagination;
    const where = {};
    filtered.forEach(({ id, value }) => {
      if (Array.isArray(value)) {
        where[id] = { in: value };
        return;
      }

      where[id] = value;
    });

    const orderByKey =
      Array.isArray(sorted) && sorted.length ? sorted[0].id : 'create_date';
    const orderByValue =
      Array.isArray(sorted) && sorted.length
        ? sorted[0].desc
          ? 'desc'
          : 'acs'
        : 'desc';
    const count = await this.prisma.role.count({
      where: where,
    });
    const data = await this.prisma.role.findMany({
      where: where,
      take: pageSize,
      skip: pageNum * pageSize,
      orderBy: { [orderByKey]: orderByValue },
    });

    return {
      data,
      rows: count,
      pages: Math.ceil(count / pageSize),
    };
  }

  public async createRole(
    createRole: UpsertRoleForRoleManagementDto,
    user: UserEntity,
  ) {
    await this.exitedAndFailRoleByRoleName(createRole.role_name);
    const role_id = this.generateRoleId();
    const newRole = await this.prisma.role.create({
      data: { role_id, ...createRole },
    });

    return newRole;
  }

  public async updateRole(
    role_id: string,
    updateRole: UpsertRoleForRoleManagementDto,
    user: UserEntity,
  ) {
    await this.findAndFailRoleByRoleId(role_id);
    await this.exitedAndFailRoleByRoleName(updateRole.role_name);

    const updated = await this.prisma.role.update({
      where: { role_id },
      data: updateRole,
    });

    return updated;
  }

  /**
   * auth role
   */
  public async existedAndFailAuthRole(
    createAuthRole: CreateAuthRoleForRoleManagementDto,
  ) {
    const authRole = await this.prisma.auth_role.findFirst({
      where: createAuthRole,
    });

    if (authRole) {
      throw new BadRequestException(
        `The relation has been existed by ${createAuthRole.role_id} with ${createAuthRole.auth_id}`,
      );
    }
  }

  public async authRolePagination(pagination: Pagination) {
    const { pageNum, pageSize, sorted, filtered } = pagination;
    const where = {};
    filtered.forEach(({ id, value }) => {
      if (Array.isArray(value)) {
        where[id] = { in: value };
        return;
      }

      where[id] = value;
    });

    const orderByKey =
      Array.isArray(sorted) && sorted.length ? sorted[0].id : 'create_date';
    const orderByValue =
      Array.isArray(sorted) && sorted.length
        ? sorted[0].desc
          ? 'desc'
          : 'acs'
        : 'desc';
    const count = await this.prisma.auth_role.count({
      where: where,
    });
    const data = await this.prisma.auth_role.findMany({
      where: where,
      take: pageSize,
      skip: pageNum * pageSize,
      orderBy: { [orderByKey]: orderByValue },
    });

    return {
      data,
      rows: count,
      pages: Math.ceil(count / pageSize),
    };
  }

  public async createAuthRole(
    createAuthRole: CreateAuthRoleForRoleManagementDto,
    user: UserEntity,
  ) {
    await this.existedAndFailAuthRole(createAuthRole);
    const authRole = await this.prisma.auth_role.create({
      data: { ...createAuthRole, status: EAUTH_ROLE_STATUS.active },
    });

    return authRole;
  }

  public async frozenAuthRole(id: number, user: UserEntity) {
    const item = await this.prisma.auth_role.findFirstOrThrow({
      where: { id },
    });

    if (item.status === EAUTH_ROLE_STATUS.inactive) {
      throw new BadRequestException("It's frozen");
    }

    const updated = await this.prisma.auth_role.update({
      where: { id: item.id },
      data: { status: EAUTH_ROLE_STATUS.inactive },
    });

    return updated;
  }

  public async reactiveAuthRole(id: number, user: UserEntity) {
    const item = await this.prisma.auth_role.findFirstOrThrow({
      where: { id },
    });

    if (item.status === EAUTH_ROLE_STATUS.active) {
      throw new BadRequestException("It's active");
    }

    const updated = await this.prisma.auth_role.update({
      where: { id: item.id },
      data: { status: EAUTH_ROLE_STATUS.active },
    });

    return updated;
  }

  /**
   * user-role
   */
  public async userRolePagination(pagination: Pagination) {
    const { pageNum, pageSize, sorted, filtered } = pagination;
    const where = {};
    filtered.forEach(({ id, value }) => {
      if (Array.isArray(value)) {
        where[id] = { in: value };
        return;
      }

      where[id] = value;
    });

    const orderByKey =
      Array.isArray(sorted) && sorted.length ? sorted[0].id : 'create_date';
    const orderByValue =
      Array.isArray(sorted) && sorted.length
        ? sorted[0].desc
          ? 'desc'
          : 'acs'
        : 'desc';
    const count = await this.prisma.user_role.count({
      where: where,
    });
    const data = await this.prisma.user_role.findMany({
      where: where,
      take: pageSize,
      skip: pageNum * pageSize,
      orderBy: { [orderByKey]: orderByValue },
    });

    return {
      data,
      rows: count,
      pages: Math.ceil(count / pageSize),
    };
  }

  public async createUserRole(
    createUserRole: CreateUserRoleForRoleManagementDto,
    user: UserEntity,
  ) {
    const userRole = await this.prisma.user_role.findFirst({
      where: createUserRole,
    });

    if (userRole) {
      throw new BadRequestException("It's existed");
    }

    const newUserRole = await this.prisma.user_role.create({
      data: { ...createUserRole, status: EUSER_ROLE_STATUS.active },
    });

    return newUserRole;
  }

  public async updateUserRole(
    id: number,
    updateUserRole: UpdateUserRoleForRoleManagementDto,
    user: UserEntity,
  ) {
    const userRoleById = await this.prisma.user_role.findUnique({
      where: { id },
    });

    if (!userRoleById) {
      throw new BadRequestException("It's not exist");
    }

    const userRole = await this.prisma.user_role.findFirst({
      where: {
        user_id: updateUserRole.user_id,
        role_id: updateUserRole.role_id,
      },
    });

    if (userRole && userRole.id !== id) {
      throw new BadRequestException("It's existed");
    }

    const updated = await this.prisma.user_role.update({
      where: { id },
      data: updateUserRole,
    });

    return updated;
  }
}
