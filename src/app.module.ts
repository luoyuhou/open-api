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

@Module({
  imports: [
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
  providers: [AppService, SchedulesService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(TraceMiddleware).forRoutes('');
    consumer.apply(LoggerMiddleware).forRoutes('');
    consumer.apply(RecordFetchMiddleware).forRoutes('');
  }
}
