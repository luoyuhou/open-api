import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { CategoryModule } from './category/category.module';
import { GoodsModule } from './goods/goods.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StoreOrderModule } from './order/store.order.module';
import { FileModule } from '../file/file.module';
import { SettlementModule } from './settlement/settlement.module';
import { StockModule } from './stock';
import { RatingModule } from './rating';
import { RefundModule } from './refund';
import { StoreSubscriptionModule } from './store-subscription/store-subscription.module';
import { StoreResourceModule } from './store-resource/store-resource.module';

@Module({
  imports: [
    PrismaModule,
    CategoryModule,
    GoodsModule,
    StoreOrderModule,
    FileModule,
    SettlementModule,
    StoreSubscriptionModule,
    StoreResourceModule,
    StockModule,
    RatingModule,
    RefundModule,
  ],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
