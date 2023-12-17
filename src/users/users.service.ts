import { Injectable } from '@nestjs/common';
import { CreateUserByPasswordDto, CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUser_signup_passwordDto } from './dto/create-user_signup_password.dto';
import { v4 } from 'uuid';
import bcrypt from 'bcrypt';
import {
  UpdateUser_signup_passwordDto,
  UpdateUser_signup_passwordInputDto,
} from './dto/update-user_signin_password.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private bcryptPassword(password: string): { pwd: string; salt: string } {
    const salt = bcrypt.genSaltSync(16);
    const pwd = bcrypt.hashSync(password, salt);
    return { pwd, salt };
  }

  async createUserByPassword(createUserDto: CreateUserByPasswordDto) {
    const { first_name, last_name, password, phone } = createUserDto;
    const user_id = 'user-' + v4();
    const user: CreateUserDto = {
      user_id,
      first_name,
      last_name,
      phone,
      status: 0,
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
}
