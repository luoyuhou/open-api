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

  static get PRISMA_LOG_LEVEL(): 'info' | 'query' | 'warn' | 'error' {
    const level = env.PRISMA_LOG!;
    if (level === 'info') {
      return 'info';
    }

    if (level === 'query') {
      return 'query';
    }

    if (level === 'warn') {
      return 'warn';
    }
    return 'error';
  }

  static get WX_APP_ID(): string {
    return env.WX_APP_ID!;
  }

  static get WX_SECRET(): string {
    return env.WX_SECRET!;
  }

  static get DATABASE_URL(): string {
    return env.DATABASE_URL!;
  }

  static get FRONTEND_URL() {
    return env.FRONTEND_URL!;
  }

  static get Q_ACCESS_KEY(): string {
    return env.Q_ACCESS_KEY!;
  }

  static get Q_SECRET_KEY(): string {
    return env.Q_SECRET_KEY!;
  }

  static get Q_BUCKET(): string {
    return env.Q_BUCKET!;
  }

  static get Q_DOMAIN(): string {
    return env.Q_DOMAIN!;
  }
}

export default Env;
