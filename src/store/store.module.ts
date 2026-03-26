import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { CategoryModule } from './category/category.module';
import { GoodsModule } from './goods/goods.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StoreOrderModule } from './order/store.order.module';
import { FileModule } from '../file/file.module';
import { SettlementModule } from './settlement/settlement.module';

@Module({
  imports: [
    PrismaModule,
    CategoryModule,
    GoodsModule,
    StoreOrderModule,
    FileModule,
    SettlementModule,
  ],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
