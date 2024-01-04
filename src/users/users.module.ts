// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OrderModule } from './order/order.module';
import { AddressModule } from './address/address.module';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [PrismaModule, OrderModule, AddressModule],
  exports: [UsersService],
})
export class UsersModule {}
