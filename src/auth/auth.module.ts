//src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JWT_SECRET } from './const';
import { LocalStrategy } from './strategies/local.strategy';
import { SessionSerializer } from './session.serializer';
import { RoleManagementModule } from './role-management/role-management.module';
import { WxLocalStrategy } from './strategies/wx-local.strategy';
import { CacheModule } from '../common/cache-manager/cache.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '5m' }, // e.g. 7d, 24h
    }),
    UsersModule,
    RoleManagementModule,
    CacheModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    SessionSerializer,
    WxLocalStrategy,
  ],
})
export class AuthModule {}
