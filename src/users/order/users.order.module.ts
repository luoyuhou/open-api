import { Module } from '@nestjs/common';
import { UsersOrderService } from './users.order.service';
import { UsersOrderController } from './users.order.controller';
import { OrderModule } from '../../order/order.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, OrderModule],
  controllers: [UsersOrderController],
  providers: [UsersOrderService],
})
export class UsersOrderModule {}
