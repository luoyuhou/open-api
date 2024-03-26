import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserByPasswordDto, CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUser_signup_passwordDto } from './dto/create-user_signup_password.dto';
import { v4 } from 'uuid';
import bcrypt = require('bcryptjs');
import {
  UpdateUser_signup_passwordDto,
  UpdateUser_signup_passwordInputDto,
} from './dto/update-user_signin_password.dto';
import { WxUserInfo } from '../auth/dto/login.dto';
import { Pagination } from '../common/dto/pagination';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private get user_id(): string {
    return 'user-' + v4();
  }

  private bcryptPassword(password: string): { pwd: string; salt: string } {
    const salt = bcrypt.genSaltSync(16);
    const pwd = bcrypt.hashSync(password, salt);
    return { pwd, salt };
  }

  async createUserByPassword(createUserDto: CreateUserByPasswordDto) {
    const { first_name, last_name, password, phone } = createUserDto;
    const findUser = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (findUser) {
      throw new BadRequestException(`电话: ${phone} 用户已存在`);
    }

    const user_id = this.user_id;
    const user: CreateUserDto = {
      user_id,
      first_name,
      last_name,
      phone,
      status: 1,
      email: null,
      avatar: null,
    };
    const { pwd, salt } = this.bcryptPassword(password);
    const userAuth: CreateUser_signup_passwordDto = {
      user_id,
      salt,
      password: pwd,
    };

    await this.prisma.$transaction([
      this.prisma.user.create({ data: user }),
      this.prisma.user_signin_password.create({ data: userAuth }),
    ]);

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(user_id: string) {
    return this.prisma.user.findFirst({ where: { user_id } });
  }

  async update(user_id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { user_id },
      data: updateUserDto,
    });
  }

  async frozen(user_id: string) {
    return this.prisma.user.update({ where: { user_id }, data: { status: 0 } });
  }

  async reactive(user_id: string) {
    return this.prisma.user.update({ where: { user_id }, data: { status: 0 } });
  }

  async resetPassword(
    user_id: string,
    resetPasswordDto: UpdateUser_signup_passwordInputDto,
  ) {
    const { salt, pwd } = this.bcryptPassword(resetPasswordDto.password);
    const data: UpdateUser_signup_passwordDto = { salt, password: pwd };
    return this.prisma.user_signin_password.update({
      where: { user_id },
      data: data,
    });
  }

  public async createByWechat(wxUserInfo: WxUserInfo, openid: string) {
    const user_id = this.user_id;
    const user: CreateUserDto = {
      user_id,
      first_name: '',
      last_name: wxUserInfo.nickName,
      phone: new Date().getTime() + '',
      status: 1,
      email: null,
      avatar: wxUserInfo.avatarUrl,
    };

    await this.prisma.$transaction([
      this.prisma.user.create({ data: user }),
      this.prisma.user_signin_wechat.create({ data: { user_id, openid } }),
    ]);

    return user;
  }

  public async usersPagination(pagination: Pagination) {
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
    const count = await this.prisma.user.count({
      where: where,
    });
    const data = await this.prisma.user.findMany({
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
}
