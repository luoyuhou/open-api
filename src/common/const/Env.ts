import dotenv = require('dotenv');

const env = dotenv.config({ path: '.env' })?.parsed || {};

class Env {
  static get IS_PROD() {
    return env.ENV === 'production';
  }

  static get IS_DEV() {
    return env.ENV !== 'production';
  }

  static get REDIS_URL() {
    return env.REDIS_URL!;
  }

  static get SERVER_PORT() {
    return env.SERVER_PORT!;
  }

  static get APP_SECRET() {
    return env.APP_SECRET!;
  }
}

export default Env;
