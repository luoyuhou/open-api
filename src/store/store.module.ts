import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { CategoryModule } from './category/category.module';
import { GoodsModule } from './goods/goods.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StoreOrderModule } from './order/store.order.module';

@Module({
  imports: [PrismaModule, CategoryModule, GoodsModule, StoreOrderModule],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
