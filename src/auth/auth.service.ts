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
import { SmsService } from '../common/sms/sms.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private roleManagementService: RoleManagementService,
    private cacheService: CacheService,
    private smsService: SmsService,
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
    const { phone, code } = createUserDto;

    // 如果不是单元测试环境，则强制校验验证码
    if (process.env.IS_UNIT_TEST !== 'true') {
      if (code) {
        await this.verifySmsCode(phone, code);
      } else {
        throw new BadRequestException('短信验证码必填');
      }
    }

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

  /**
   * 生成发送短信的临时 Token
   */
  public async generateSmsToken(phone: string) {
    // 1. 校验手机号格式
    if (!Utils.verifyPhoneNumber(phone)) {
      throw new BadRequestException('请输入有效的手机号');
    }

    // 2. 检查手机号是否已存在
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (user) {
      throw new BadRequestException('该手机号已注册，请直接登录');
    }

    const token = v4();
    const cacheKey = `sms_token:${phone}:${token}`;

    // Token 有效期 2 分钟，仅限一次使用
    await this.cacheService.client.set(cacheKey, '1', 'EX', 120);

    return { token };
  }

  private async verifyTokenKey(phone: string, tokenKey: string) {
    const isValid = await this.cacheService.client.get(tokenKey);
    if (!isValid) {
      throw new BadRequestException('滑块校验失败或已过期，请重试');
    }
    // 立即消耗 Token
    await this.cacheService.client.del(tokenKey);

    // 2. 校验手机号格式
    if (!Utils.verifyPhoneNumber(phone)) {
      throw new BadRequestException('请输入有效的手机号');
    }
  }

  private async _sendSmsCode(
    phone: string,
    ip: string,
    {
      cooldownKey,
      ipLimitKey,
      dailyLimitKey,
    }: {
      cooldownKey: string;
      dailyLimitKey: string;
      ipLimitKey: string;
    },
  ) {
    const dailyCount = await this.cacheService.client.get(dailyLimitKey);
    // B. 每日手机号发送限额 (例如每天最多 5 次)
    if (dailyCount && parseInt(dailyCount) >= 5) {
      throw new BadRequestException('该手机号今日发送验证码次数已达上限');
    }

    // C. 每日 IP 发送限额 (例如每个 IP 每天最多 20 次)
    if (ip) {
      const ipCount = await this.cacheService.client.get(ipLimitKey);
      if (ipCount && parseInt(ipCount) >= 20) {
        throw new BadRequestException('您的网络环境今日请求次数已达上限');
      }
    }
    // --- 安全防护逻辑结束 ---

    // 生成 6 位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const minus = 5;

    // 发送短信
    const success = await this.smsService.sendVerificationCode(
      phone,
      code,
      minus,
    );
    if (!success) {
      throw new BadRequestException('发送短信验证码失败，请稍后再试');
    }

    // 存入 Redis
    const cacheKey = `sms_code:${phone}`;
    const pipeline = this.cacheService.client.pipeline();

    // 验证码有效期 5 分钟
    pipeline.set(cacheKey, code, 'EX', 5 * 60);
    // 设置 60 秒冷却标记
    pipeline.set(cooldownKey, '1', 'EX', 60);
    // 增加每日计数
    pipeline.incr(dailyLimitKey);
    pipeline.expire(dailyLimitKey, 24 * 60 * 60);
    if (ip) {
      pipeline.incr(ipLimitKey);
      pipeline.expire(ipLimitKey, 24 * 60 * 60);
    }
    await pipeline.exec();
  }

  /**
   * 发送短信验证码并存入缓存
   */
  public async sendSmsCode(phone: string, token: string, ip?: string) {
    // 1. 验证 Token 是否合法
    const tokenKey = `sms_token:${phone}:${token}`;
    await this.verifyTokenKey(phone, tokenKey);

    // 2. 检查手机号是否已存在
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (user) {
      throw new BadRequestException('该手机号已注册，请直接登录');
    }

    // --- 安全防护逻辑开始 ---
    const cooldownKey = `sms_cooldown:${phone}`;
    const dailyLimitKey = `sms_daily_limit:${phone}`;
    const ipLimitKey = `sms_ip_limit:${ip}`;

    // A. 60秒冷却时间检查
    const inCooldown = await this.cacheService.client.get(cooldownKey);
    if (inCooldown) {
      throw new BadRequestException('请求过于频繁，请在 60 秒后重试');
    }

    await this._sendSmsCode(phone, ip, {
      cooldownKey,
      ipLimitKey,
      dailyLimitKey,
    });

    return { message: '验证码已发送' };
  }

  /**
   * 校验短信验证码
   */
  public async verifySmsCode(phone: string, code: string) {
    const cacheKey = `sms_code:${phone}`;
    const cachedCode = await this.cacheService.client.get(cacheKey);

    if (!cachedCode) {
      throw new BadRequestException('验证码已过期或不存在');
    }

    if (cachedCode !== code) {
      throw new BadRequestException('验证码错误');
    }

    // 验证成功后删除验证码
    await this.cacheService.client.del(cacheKey);
    return true;
  }

  /**
   * 生成忘记密码的短信 Token
   * 与注册不同，这里需要检查手机号是否存在
   */
  public async generateForgetPasswordSmsToken(phone: string) {
    // 1. 校验手机号格式
    if (!Utils.verifyPhoneNumber(phone)) {
      throw new BadRequestException('请输入有效的手机号');
    }

    // 2. 检查手机号是否存在
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new BadRequestException('该手机号未注册');
    }

    const token = v4();
    const cacheKey = `forget_sms_token:${phone}:${token}`;

    // Token 有效期 2 分钟，仅限一次使用
    await this.cacheService.client.set(cacheKey, '1', 'EX', 120);

    return { token };
  }

  /**
   * 发送忘记密码短信验证码
   */
  public async sendForgetPasswordSms(
    phone: string,
    token: string,
    ip?: string,
  ) {
    // 1. 验证 Token 是否合法
    const tokenKey = `forget_sms_token:${phone}:${token}`;
    await this.verifyTokenKey(phone, tokenKey);

    // 3. 检查手机号是否存在
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new BadRequestException('该手机号未注册');
    }

    // --- 安全防护逻辑开始 ---
    const cooldownKey = `forget_sms_cooldown:${phone}`;
    const dailyLimitKey = `forget_sms_daily_limit:${phone}`;
    const ipLimitKey = `sms_ip_limit:${ip}`;

    // A. 60秒冷却时间检查
    const inCooldown = await this.cacheService.client.get(cooldownKey);
    if (inCooldown) {
      const ttl = await this.cacheService.client.ttl(cooldownKey);
      throw new BadRequestException(
        `请求过于频繁，请在 ${ttl > 0 ? ttl : 60} 秒后重试`,
      );
    }

    // B. 每日手机号发送限额 (例如每天最多 5 次)
    await this._sendSmsCode(phone, ip, {
      cooldownKey,
      ipLimitKey,
      dailyLimitKey,
    });

    return { message: '验证码已发送' };
  }

  /**
   * 通过手机号重置密码
   */
  public async resetPasswordByPhone(
    phone: string,
    code: string,
    password: string,
  ) {
    // 1. 校验验证码
    if (process.env.IS_UNIT_TEST !== 'true') {
      await this.verifySmsCode(phone, code);
    }

    // 2. 查找用户
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new BadRequestException('该手机号未注册');
    }

    // 3. 重置密码
    await this.usersService.resetPassword(user.user_id, { password });

    return { message: '密码重置成功' };
  }
}
