import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { StoreModule } from './store/store.module';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import { OrderModule } from './order/order.module';
import { GeneralModule } from './general/general.module';
import { WxModule } from './wx/wx.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import Env from './common/const/Env';
import { RecordFetchMiddleware } from './common/middlewares/record-fetch.middleware';
import { TraceMiddleware } from './common/middlewares/trace.middleware';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulesService } from './schedules/schedules.service';
import { UsersFetchModule } from './users/users-fetch/users-fetch.module';
import { CacheModule } from './common/cache-manager/cache.module';
import { ChatGateway } from './chat/chat.gateway';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    CacheModule,
    TerminusModule,
    UsersModule,
    AuthModule,
    StoreModule,
    OrderModule,
    GeneralModule,
    WxModule,
    TypeOrmModule.forRoot({ type: 'mysql', url: Env.DATABASE_URL }),
    TerminusModule,
    UsersFetchModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    SchedulesService,
    ChatGateway,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(TraceMiddleware).forRoutes('');
    consumer.apply(LoggerMiddleware).forRoutes('');
    consumer.apply(RecordFetchMiddleware).forRoutes('');
  }
}
