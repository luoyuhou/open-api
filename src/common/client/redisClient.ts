// import { createClient } from 'redis';
import Redis from 'ioredis';
import Env from '../const/Env';
import { Logger } from '@nestjs/common';

class CustomRedisClient {
  private readonly logger = new Logger(CustomRedisClient.name);

  get instance() {
    // const client = createClient({ url: Env.REDIS_URL });
    const client = new Redis({
      host: Env.REDIS_HOST,
      port: Env.REDIS_PORT,
      db: Env.REDIS_DB,
      lazyConnect: true,
    });

    client
      .connect()
      .then(() => this.logger.log(`Successful connected redis`))
      .catch((e) => this.logger.error(`Failed connect redis. ${e}`));

    return client;
  }
}

export default new CustomRedisClient().instance;
