import redisClient from '../client/redisClient';
import customLogger from '../logger';
import { ResourcesFromAuth } from '../../auth/role-management/dto/create-auth-for-role-management.dto';
import { UserEntity } from '../../users/entities/user.entity';

class CacheManager {
  private readonly USER_SESSION_MAP = 'user-session-map';

  public async setSessionId(user_id: string, sid: string) {
    return redisClient.hset(this.USER_SESSION_MAP, user_id, sid);
  }

  public async getSessionIdByUserId(user_id: string) {
    return redisClient.hget(this.USER_SESSION_MAP, user_id);
  }

  public async delSessionIdByUserId(user_id: string) {
    await redisClient.hdel(this.USER_SESSION_MAP, user_id);
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
    await redisClient.set(key, JSON.stringify(resources));
    await redisClient.expire(key, 86400);
  }

  public async getResourceForUser(user_id: string): Promise<{
    userAuth: UserEntity | null;
    resources: ResourcesFromAuth[];
  }> {
    const key = this.generateResourceKey(user_id);
    const data = await redisClient.get(key);

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
    return redisClient.del(key);
  }
}

export default new CacheManager();
