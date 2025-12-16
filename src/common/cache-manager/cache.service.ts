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

  /**
   * 检查 Redis 连接健康状态
   */
  async isHealthy(): Promise<boolean> {
    try {
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
}
