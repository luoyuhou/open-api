import customLogger from '../logger';
import { ResourcesFromAuth } from '../../auth/role-management/dto/create-auth-for-role-management.dto';
import { UserEntity } from '../../users/entities/user.entity';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import Env from '../const/Env';

@Injectable()
export class CacheService implements OnModuleDestroy {
  public client: Redis;
  private readonly logger = new Logger(CacheService.name);
  private readonly USER_SESSION_MAP = 'user-session-map';

  constructor() {
    this.client = new Redis({
      host: Env.REDIS_HOST,
      port: Env.REDIS_PORT,
      db: Env.REDIS_DB,
      password: Env.REDIS_PASSWORD || undefined,
      tls: Env.REDIS_USE_TLS ? {} : undefined,
      lazyConnect: false,
      retryStrategy: (times) => {
        if (times > 10) {
          this.logger.error(`Redis retry failed after ${times} attempts`);
          return null; // 停止重试
        }
        const delay = Math.min(times * 100, 3000);
        this.logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: null, // 无限重试单个请求
      enableReadyCheck: true,
      enableOfflineQueue: false, // 不缓存离线期间的命令
      connectTimeout: 10000,
      keepAlive: 30000,
      family: 4, // 强制使用 IPv4
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    // 监听错误事件
    this.client.on('error', (err) => {
      // 只记录非连接重置的错误
      if (!err.message.includes('ECONNRESET')) {
        this.logger.error(`Redis Client Error: ${err.message}`);
      }
    });

    this.client.on('reconnecting', (delay) => {
      this.logger.log(`Redis reconnecting in ${delay}ms...`);
    });

    this.client.on('ready', () => {
      this.logger.log('✅ Redis Client Ready');
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Redis Client Connected');
    });

    this.client.on('close', () => {
      this.logger.warn('⚠️ Redis Connection Closed');
    });

    this.client.on('end', () => {
      this.logger.warn('⚠️ Redis Connection Ended');
    });
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
      this.logger.log('Redis connection closed gracefully');
    } catch (error) {
      this.logger.error('Error closing Redis connection:', error);
    }
  }

  public isReady(): boolean {
    return this.client.status === 'ready';
  }

  /** 等待 Redis ready；超时返回 false（不抛错） */
  public async waitUntilReady(timeoutMs = 15000): Promise<boolean> {
    if (this.isReady()) return true;

    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.client.off('ready', onReady);
        resolve(ok);
      };
      const onReady = () => finish(true);
      const timer = setTimeout(() => finish(false), timeoutMs);
      this.client.once('ready', onReady);
      // 注册监听后再次检查，避免竞态漏掉 ready
      if (this.isReady()) finish(true);
    });
  }

  /**
   * 检查 Redis 连接健康状态
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.isReady()) return false;
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  public async setSessionId(user_id: string, sid: string) {
    return this.client.hset(this.USER_SESSION_MAP, user_id, sid);
  }

  public async getSessionIdByUserId(user_id: string) {
    return this.client.hget(this.USER_SESSION_MAP, user_id);
  }

  public async delSessionIdByUserId(user_id: string) {
    await this.client.hdel(this.USER_SESSION_MAP, user_id);
    await this.delResourceForUser(user_id);
    await this.clearUserKicked(user_id);
  }

  /**
   * 登录成功后登记在线：user-session-map + 踢旧 session
   * @param sessionID express-session 的 sessionID（不含 sess: 前缀）
   */
  public async bindOnlineSession(
    user_id: string,
    sessionID: string,
  ): Promise<void> {
    if (!user_id || !sessionID) return;
    const sid = sessionID.startsWith('sess:') ? sessionID : `sess:${sessionID}`;

    const oldSid = await this.getSessionIdByUserId(user_id);
    if (oldSid && oldSid !== sid) {
      await this.client.del(oldSid);
    }

    await this.setSessionId(user_id, sid);
    await this.clearUserKicked(user_id);
  }

  private kickedKey(user_id: string) {
    return `kicked:${user_id}`;
  }

  public async markUserKicked(user_id: string) {
    await this.client.set(this.kickedKey(user_id), '1', 'EX', 86400);
  }

  public async isUserKicked(user_id: string): Promise<boolean> {
    const v = await this.client.get(this.kickedKey(user_id));
    return v === '1';
  }

  public async clearUserKicked(user_id: string) {
    await this.client.del(this.kickedKey(user_id));
  }

  private generateResourceKey(user_id: string) {
    return `auth:${user_id}`;
  }

  public async setResourcesForUser(
    user_id: string,
    resources: Record<string, any>,
  ) {
    const key = this.generateResourceKey(user_id);
    await this.client.set(key, JSON.stringify(resources));
    await this.client.expire(key, 86400);
  }

  public async getResourceForUser(user_id: string): Promise<{
    userAuth: UserEntity | null;
    resources: ResourcesFromAuth[];
  }> {
    const key = this.generateResourceKey(user_id);
    const data = await this.client.get(key);

    if (!data) {
      return { userAuth: null, resources: [] };
    }

    try {
      return JSON.parse(data);
    } catch (e) {
      customLogger.error({
        message: 'Failed parse resources',
        user_id,
        data,
        error: e,
      });
      return { userAuth: null, resources: [] };
    }
  }

  public async delResourceForUser(user_id: string) {
    const key = this.generateResourceKey(user_id);
    return this.client.del(key);
  }

  /**
   * 获取真实在线用户 ID：仅 user-session-map 中且 sess:* 仍存在的用户。
   * 不把 auth:* 资源缓存算作在线（登出/过期后常残留，会导致人数虚高）。
   * 顺带清理已失效的 map / auth 缓存。
   */
  public async getAllOnlineUserIds(): Promise<string[]> {
    try {
      if (!this.isReady()) {
        this.logger.warn('Redis not ready, skip online user scan');
        return [];
      }

      const mappedIds = await this.client.hkeys(this.USER_SESSION_MAP);
      if (!mappedIds.length) {
        return [];
      }

      const online: string[] = [];
      for (const userId of mappedIds) {
        if (!userId) continue;

        const sid = await this.getSessionIdByUserId(userId);
        if (!sid) {
          await this.client.hdel(this.USER_SESSION_MAP, userId);
          await this.delResourceForUser(userId);
          continue;
        }

        const sessionKey = sid.startsWith('sess:') ? sid : `sess:${sid}`;
        const alive = await this.client.exists(sessionKey);
        if (alive === 1) {
          online.push(userId);
        } else {
          // session 已过期，清理残留登记
          await this.client.hdel(this.USER_SESSION_MAP, userId);
          await this.delResourceForUser(userId);
        }
      }

      return online;
    } catch (error) {
      this.logger.error('Failed to get online user ids:', error);
      return [];
    }
  }

  /**
   * 踢用户下线
   * 1. 删除 sess:* session
   * 2. 标记 kicked（防残留/多端漏删）
   * 3. 清理 user-session-map、auth:*
   */
  public async kickUserOffline(user_id: string): Promise<boolean> {
    try {
      const sessionId = await this.getSessionIdByUserId(user_id);

      if (sessionId) {
        await this.client.del(sessionId);
        this.logger.log(`Deleted session: ${sessionId} for user: ${user_id}`);
      }

      await this.markUserKicked(user_id);
      await this.client.hdel(this.USER_SESSION_MAP, user_id);
      await this.delResourceForUser(user_id);

      this.logger.log(`Successfully kicked user offline: ${user_id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to kick user offline: ${user_id}`, error);
      return false;
    }
  }

  // ==================== Used Quota Cache ====================
  private readonly USED_QUOTA_PREFIX = 'used_quota:';
  private readonly USED_QUOTA_TTL = 3600; // 1 hour

  /**
   * 生成 used_quota 的 Redis key
   */
  private getUsedQuotaKey(store_id: string): string {
    return `${this.USED_QUOTA_PREFIX}${store_id}`;
  }

  /**
   * 获取商店的已使用配额（从 Redis 缓存）
   * @returns 已使用配额（字节），如果缓存不存在返回 null
   */
  public async getUsedQuota(store_id: string): Promise<number | null> {
    const key = this.getUsedQuotaKey(store_id);
    const data = await this.client.get(key);

    if (!data) {
      return null;
    }

    return parseInt(data, 10);
  }

  /**
   * 设置商店的已使用配额（存入 Redis 缓存）
   * @param store_id 商店 ID
   * @param usedQuota 已使用配额（字节）
   */
  public async setUsedQuota(
    store_id: string,
    usedQuota: number,
  ): Promise<void> {
    const key = this.getUsedQuotaKey(store_id);
    await this.client.set(key, usedQuota.toString(), 'EX', this.USED_QUOTA_TTL);
  }

  /**
   * 使商店的已使用配额缓存失效
   * @param store_id 商店 ID
   */
  public async invalidateUsedQuota(store_id: string): Promise<void> {
    const key = this.getUsedQuotaKey(store_id);
    await this.client.del(key);
  }
}
