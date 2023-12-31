import {
  ValidationPipe,
  HttpStatus,
  INestApplication,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { useContainer } from 'class-validator';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import * as passport from 'passport';
import { AppModule } from './app.module';
import Env from './common/const/Env';
import { Reflector } from '@nestjs/core';
import redisClient from './common/client/redisClient';
import RedisStore from 'connect-redis';
import rTracer = require('cls-rtracer');

export function setup(app: INestApplication): INestApplication {
  // app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  app.use(cookieParser(process.env.APP_SECRET));
  app.use(rTracer.expressMiddleware());

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const redisStore = new RedisStore({ client: redisClient });

  app.use(
    session({
      secret: Env.APP_SECRET,
      resave: false,
      saveUninitialized: false,
      store: redisStore,
      cookie: {
        httpOnly: true,
        signed: true,
        sameSite: 'strict',
        secure: Env.IS_PROD,
      },
      // genid(req: e.Request): string {
      //   const _sid = uid.sync(32);
      //   const { user } = (
      //     req.session as unknown as { passport: { user: UserEntity } }
      //   ).passport;
      //   const sid = `sess:${_sid}`;
      //   redisClient
      //     .hset('user-session-map', user.user_id, sid)
      //     .then(() =>
      //       customLogger.log(
      //         `Successful set user_id [${user.user_id}] value [${sid}] on user-session-map`,
      //       ),
      //     )
      //     .catch((e) =>
      //       customLogger.error(
      //         `Failed set user_id [${user.user_id}] value [${sid}] on user-session-map. ${e}`,
      //       ),
      //     );
      //   return _sid;
      // },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(/\s*,\s*/) ?? '*',
    credentials: true,
    exposedHeaders: ['Authorization'],
  });

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  return app;
}
