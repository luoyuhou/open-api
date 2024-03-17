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

@Module({
  imports: [
    PrismaModule,
    TerminusModule,
    UsersModule,
    AuthModule,
    StoreModule,
    OrderModule,
    GeneralModule,
    WxModule,
    TypeOrmModule.forRoot({ type: 'mysql', url: Env.DATABASE_URL }),
    TerminusModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(LoggerMiddleware).forRoutes('');
  }
}
