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
import { RecordFetchMiddleware } from './common/middlewares/record-fetch.middleware';
import { TraceMiddleware } from './common/middlewares/trace.middleware';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulesModule } from './schedules/schedules.module';
import { CacheModule } from './common/cache-manager/cache.module';
import { SmsModule } from './common/sms/sms.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { FileModule } from './file/file.module';
import { HomeBannerModule } from './home-banner/home-banner.module';
import { ChatController } from './chat/chat.controller';
import { ChatModule } from './chat/chat.module';
import { FeedbackModule } from './feedback/feedback.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 200,
      },
    ]),
    PrismaModule,
    CacheModule,
    SmsModule,
    TerminusModule,
    UsersModule,
    AuthModule,
    StoreModule,
    OrderModule,
    GeneralModule,
    WxModule,
    FileModule,
    HomeBannerModule,
    ChatModule,
    FeedbackModule,
    TerminusModule,
    ScheduleModule.forRoot(),
    SchedulesModule,
  ],
  controllers: [AppController, HealthController, ChatController],
  providers: [
    AppService,
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
