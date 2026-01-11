import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CategoryModule } from '../category/category.module';
import { GoodsModule } from '../goods/goods.module';
import { OrderModule } from '../../order/order.module';
import { StoreOrderController } from './store.order.controller';
import { StoreOrderService } from './store.order.service';

@Module({
  imports: [PrismaModule, CategoryModule, GoodsModule, OrderModule],
  controllers: [StoreOrderController],
  providers: [StoreOrderService],
})
export class StoreOrderModule {}
