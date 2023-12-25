import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { StoreModule } from './store/store.module';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [PrismaModule, TerminusModule, UsersModule, AuthModule, StoreModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
