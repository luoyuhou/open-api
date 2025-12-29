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
import bcrypt = require('bcryptjs');
import * as moment from 'moment';
import { FILED_LOGIN_TIMES, Login_SOURCE_TYPES } from './const';
import {
  AddLoginHistoryByInputDto,
  AddLoginHistoryDto,
} from './dto/add-login-history.dto';
import { UsersService } from '../users/users.service';
import {
  CreateUserByPasswordDto,
  CreateUserDto,
} from '../users/dto/create-user.dto';
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
import { QrCodeStatus } from './dto/qr-login.dto';
import { Request } from 'express';
import Utils from '../common/utils';

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

  private async loginUserForWeb(
    request: Request,
    user: UserEntity,
    type: Login_SOURCE_TYPES,
  ) {
    const ip = (request.headers['x-forwarded-host'] as string) || request.ip;
    const useragent = request.headers['user-agent'];

    this.addLoginHistory((user as UserEntity).user_id, type, {
      ip: Utils.formatIp(ip),
      useragent,
    });
    const { userAuth, resources } = await this.setCacheResources(
      (user as UserEntity).user_id,
    );
    return {
      message: 'ok',
      data: user,
      resources: userAuth
        ? [{ auth_id: '*', side: 0, path: '*', method: '*' }].concat(
            ...resources,
          )
        : resources,
    };
  }

  public async loginUserForWebByPassword(request: Request) {
    const { user } = request as unknown as { user: UserEntity };
    return this.loginUserForWeb(request, user, Login_SOURCE_TYPES.password);
  }

  public async loginUserForWebByScan(request: Request, user: UserEntity) {
    return this.loginUserForWeb(request, user, Login_SOURCE_TYPES.wechat);
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

    let user: CreateUserDto;
    if (userSignWechat) {
      user = await this.prisma.user.findUnique({
        where: { user_id: userSignWechat.user_id },
      });
    } else {
      const wxUserInfo: WxUserInfo = JSON.parse(rawData);
      user = await this.usersService.createByWechat(wxUserInfo, openid);
    }

    return { user, openid };
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

  /**
   * 生成二维码登录
   */
  public async generateQrCode() {
    const qrCodeId = v4();
    const QR_CODE_EXPIRES = 60; // 60秒过期

    const cacheKey = `qrcode:${qrCodeId}`;
    const cacheValue = JSON.stringify({
      status: QrCodeStatus.PENDING,
      timestamp: Date.now(),
    });

    // 存储到缓存，key: qrcode:${qrCodeId}, value: { status, timestamp }
    await this.cacheService.client.set(cacheKey, cacheValue);

    await this.cacheService.client.expire(cacheKey, QR_CODE_EXPIRES);

    // 验证是否存储成功
    await this.cacheService.client.get(cacheKey);
    await this.cacheService.client.ttl(cacheKey);

    return {
      qrCodeId,
      qrCodeContent: qrCodeId, // 前端会生成完整的扫码内容
      expiresIn: QR_CODE_EXPIRES,
    };
  }

  /**
   * 查询二维码状态
   */
  public async checkQrCodeStatus(qrCodeId: string): Promise<{
    status: QrCodeStatus;
    remainingTime: number;
    user: UserEntity | null;
  }> {
    const cacheKey = `qrcode:${qrCodeId}`;
    const cache = await this.cacheService.client.get(cacheKey);

    if (!cache) {
      return {
        status: QrCodeStatus.EXPIRED,
        remainingTime: 0,
        user: null,
      };
    }

    const data = JSON.parse(cache);
    const ttl = await this.cacheService.client.ttl(cacheKey);

    // 如果状态不是已确认，直接返回状态信息
    if (data.status !== 'confirmed') {
      throw new BadRequestException({
        status: data.status,
        user: null,
        remainingTime: data.remainingTime,
      });
    }

    // 如果状态是已确认，返回用户信息
    if (data.status === QrCodeStatus.CONFIRMED && data.user_id) {
      const user = await this.prisma.user.findUnique({
        where: { user_id: data.user_id },
      });

      if (user) {
        // 删除二维码记录
        await this.cacheService.client.del(cacheKey);

        return {
          status: QrCodeStatus.CONFIRMED,
          user: user,
          remainingTime: ttl > 0 ? ttl : 0,
        };
      }
    }

    return {
      status: data.status as QrCodeStatus,
      remainingTime: ttl > 0 ? ttl : 0,
      user: null,
    };
  }

  private async _getCacheByQrCodeId(qrCodeId: string) {
    // 尝试解析 qrCodeId（防止前端传递 JSON 字符串）
    let actualQrCodeId = qrCodeId;

    try {
      const parsed = JSON.parse(qrCodeId);
      if (parsed.qrCodeId) {
        actualQrCodeId = parsed.qrCodeId;
      }
    } catch (e) {
      // 不是 JSON，使用原值
    }

    const cacheKey = `qrcode:${actualQrCodeId}`;
    const cache = await this.cacheService.client.get(cacheKey);

    if (!cache) {
      throw new BadRequestException('二维码已过期或不存在');
    }

    return { data: JSON.parse(cache), cacheKey };
  }

  /**
   * 小程序扫描二维码（标记为已扫描）
   */
  public async scanQrCode(qrCodeId: string, openid: string) {
    const { data, cacheKey } = await this._getCacheByQrCodeId(qrCodeId);
    data.status = QrCodeStatus.SCANNED;
    data.openid = openid;
    data.scannedAt = Date.now();

    const ttl = await this.cacheService.client.ttl(cacheKey);
    await this.cacheService.client.set(cacheKey, JSON.stringify(data));
    await this.cacheService.client.expire(cacheKey, ttl);

    return { message: 'ok' };
  }

  /**
   * 小程序确认登录
   */
  public async confirmQrLogin(qrCodeId: string, openid: string) {
    const { data, cacheKey } = await this._getCacheByQrCodeId(qrCodeId);
    if (data.openid !== openid) {
      throw new BadRequestException('openid不匹配');
    }

    // 查找用户
    const userSignWechat = await this.prisma.user_signin_wechat.findUnique({
      where: { openid },
    });

    if (!userSignWechat) {
      throw new NotFoundException('用户未绑定微信');
    }

    const user = await this.prisma.user.findUnique({
      where: { user_id: userSignWechat.user_id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (!user.status) {
      throw new BadRequestException('用户已被冻结');
    }

    // 更新状态为已确认
    data.status = QrCodeStatus.CONFIRMED;
    data.user_id = user.user_id;
    data.confirmedAt = Date.now();

    const ttl = await this.cacheService.client.ttl(cacheKey);
    await this.cacheService.client.set(cacheKey, JSON.stringify(data));
    await this.cacheService.client.expire(cacheKey, ttl);

    return { message: 'ok', user: new UserEntity(user) };
  }
}
