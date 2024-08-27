//src/auth/auth.service.ts
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuthEntity } from './entity/auth.entity';
import bcrypt = require('bcryptjs');
import * as moment from 'moment';
import { FILED_LOGIN_TIMES, Login_SOURCE_TYPES } from './const';
import {
  AddLoginHistoryByInputDto,
  AddLoginHistoryDto,
} from './dto/add-login-history.dto';
import { UsersService } from '../users/users.service';
import { CreateUserByPasswordDto } from '../users/dto/create-user.dto';
import { UserEntity } from '../users/entities/user.entity';
import { UpdateUser_signup_passwordInputDto } from '../users/dto/update-user_signin_password.dto';
import fetchClient from '../common/client/fetch-client';
import env from '../common/const/Env';
import { v4 } from 'uuid';
import { WxLoginDto, WxUserInfo } from './dto/login.dto';
import sha1 = require('sha1');
import { RoleManagementService } from './role-management/role-management.service';
import { ResourcesFromAuth } from './role-management/dto/create-auth-for-role-management.dto';
import { CacheService } from '../common/cache-manager/cache.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private roleManagementService: RoleManagementService,
    private cacheService: CacheService,
  ) {}

  @Inject(forwardRef(() => UsersService))
  private readonly usersService: UsersService;

  public async setCacheResources(user_id: string) {
    const { userAuth = null, resources } =
      await this.roleManagementService.getResourcesByUserId(user_id);

    await this.cacheService.setResourcesForUser(user_id, {
      userAuth,
      resources,
    });

    return { userAuth, resources };
  }

  public async getCacheResources(user_id: string): Promise<{
    userAuth: UserEntity | null;
    resources: ResourcesFromAuth[];
  }> {
    return this.cacheService.getResourceForUser(user_id);
  }

  public async createUserByPassword(createUserDto: CreateUserByPasswordDto) {
    return this.usersService.createUserByPassword(createUserDto);
  }

  private async loginFail(user_id: string) {
    const userAuth = await this.prisma.user_signin_password.findFirst({
      where: { user_id },
    });

    if (!userAuth) {
      throw new NotFoundException(`No user auth found for user_id: ${user_id}`);
    }

    // update
    if (userAuth.failed_login_times >= FILED_LOGIN_TIMES) {
      return;
    }
    const times = userAuth.failed_login_times + 1;
    const lockDate = times >= FILED_LOGIN_TIMES ? new Date() : null;
    return this.prisma.user_signin_password.update({
      where: { user_id },
      data: { failed_login_times: times, locked_date: lockDate },
    });
  }

  private async createLoginHistory(data: AddLoginHistoryDto) {
    return this.prisma.user_signin_history.create({ data });
  }

  public signToken(user: UserEntity) {
    return this.jwtService.sign(user);
  }

  private async getUserAuthPassword(user_id: string) {
    const userAuth = await this.prisma.user_signin_password.findUnique({
      where: { user_id },
    });

    if (!userAuth) {
      throw new NotFoundException(`No user auth found for user_id: ${user_id}`);
    }

    return userAuth;
  }

  public addLoginHistory(
    user_id: string,
    source: Login_SOURCE_TYPES,
    req: AddLoginHistoryByInputDto,
  ) {
    this.createLoginHistory({
      user_id,
      source,
      ...req,
    }).catch((err) =>
      console.log(
        `[createLoginHistory] user_id: ${user_id}, req: ${JSON.stringify(
          req,
        )}. Error: ${err}`,
      ),
    );
  }

  public async verifyCode(code: string) {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${env.WX_APP_ID}&secret=${env.WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
    const response = await fetchClient.get<{
      openid: string;
      session_key: string;
    }>(url);

    const uuid = v4();
    await this.cacheService.client.set(uuid, JSON.stringify(response));
    await this.cacheService.client.expire(uuid, 30);
    return { uuid };
  }

  public async loginByWx(wxLoginDto: WxLoginDto) {
    const { uuid, signature, rawData } = wxLoginDto;
    const cache = await this.cacheService.client.get(uuid);
    if (!cache) {
      throw new BadRequestException(`The session has been is expired`);
    }

    // await redisClient.del(uuid);

    const { session_key, openid } = JSON.parse(cache);

    const signature2 = sha1(rawData + session_key);
    if (signature !== signature2) {
      throw new BadRequestException('Invalid session');
    }

    const userSignWechat = await this.prisma.user_signin_wechat.findUnique({
      where: { openid },
    });

    if (userSignWechat) {
      return this.prisma.user.findUnique({
        where: { user_id: userSignWechat.user_id },
      });
    }

    const wxUserInfo: WxUserInfo = JSON.parse(rawData);
    return this.usersService.createByWechat(wxUserInfo, openid);
  }

  public async loginByPassword(
    phone: string,
    password: string,
  ): Promise<UserEntity> {
    // Step 1: Fetch a user with the given email
    const user = await this.prisma.user.findUnique({ where: { phone } });

    // If no user is found, throw an error
    if (!user) {
      throw new NotFoundException(`No user found for phone: ${phone}`);
    }

    if (!user.status) {
      throw new BadRequestException(
        `The user has been frozen for phone: ${phone}`,
      );
    }

    const userAuth = await this.prisma.user_signin_password.findUnique({
      where: { user_id: user.user_id },
    });

    if (!userAuth) {
      throw new NotFoundException(`No user auth found for phone: ${phone}`);
    }

    const now = new Date();
    const isSameDate = moment(now).isSame(userAuth?.locked_date || now, 'day');
    if (isSameDate && userAuth.locked_date) {
      throw new BadRequestException(
        `The user is locked for phone: ${phone} on ${moment(
          userAuth.locked_date,
          'YYYY-MM-DDTHH:mm',
        )} and will be automatically unlocked 24 hours later`,
      );
    }

    // Step 2: Check if the password is correct
    const isPasswordValid =
      userAuth.password === bcrypt.hashSync(password, userAuth.salt);

    // If password does not match, throw an error
    if (!isPasswordValid) {
      await this.loginFail(user.user_id);
      throw new UnauthorizedException('Invalid password');
    }

    // Step 3: Generate a JWT containing the user's ID and return it
    // return this.login(user);
    return user;
  }

  public async resetPassword(
    user_id: string,
    data: UpdateUser_signup_passwordInputDto,
  ) {
    await this.getUserAuthPassword(user_id);
    return this.usersService.resetPassword(user_id, data);
  }

  public async frozen(user_id: string) {
    return this.usersService.frozen(user_id);
  }

  public async reactive(user_id: string) {
    return this.usersService.reactive(user_id);
  }
}
