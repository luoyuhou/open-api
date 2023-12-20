// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OrderModule } from './order/order.module';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [PrismaModule, OrderModule],
  exports: [UsersService],
})
export class UsersModule {}
