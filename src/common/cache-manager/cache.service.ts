import customLogger from '../logger';
import { ResourcesFromAuth } from '../../auth/role-management/dto/create-auth-for-role-management.dto';
import { UserEntity } from '../../users/entities/user.entity';
import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import Env from '../const/Env';

@Injectable()
export class CacheService {
  public client: Redis;
  private readonly logger = new Logger(CacheService.name);
  private readonly USER_SESSION_MAP = 'user-session-map';

  constructor() {
    this.client = new Redis({
      host: Env.REDIS_HOST,
      port: Env.REDIS_PORT,
      db: Env.REDIS_DB,
      lazyConnect: true,
    });

    this.client
      .connect()
      .then(() => this.logger.log(`Successful connected redis`))
      .catch((e) => this.logger.error(`Failed connect redis. ${e}`));
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
