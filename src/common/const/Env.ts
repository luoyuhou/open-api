import dotenv = require('dotenv');

const env = dotenv.config({ path: '.env' })?.parsed || {};

class Env {
  static get IS_PROD() {
    return env.ENV === 'production';
  }

  static get IS_DEV() {
    return env.ENV !== 'production';
  }

  static get REDIS_HOST() {
    return env.REDIS_HOST!;
  }

  static get REDIS_PORT() {
    return Number(env.REDIS_PORT!);
  }

  static get REDIS_DB() {
    return Number(env.REDIS_DB!);
  }

  static get REDIS_URL() {
    return `redis://${env.REDIS_HOST}:${env.REDIS_PORT}/${env.REDIS_DB}`;
  }

  static get SERVER_PORT() {
    return env.SERVER_PORT!;
  }

  static get APP_SECRET() {
    return env.APP_SECRET!;
  }
}

export default Env;
