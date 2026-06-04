import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { CategoryModule } from './category/category.module';
import { GoodsModule } from './goods/goods.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StoreOrderModule } from './order/store.order.module';
import { FileModule } from '../file/file.module';
import { SettlementModule } from './settlement/settlement.module';
import { CashierController } from './cashier/cashier.controller';
import { CashierService } from './cashier/cashier.service';

@Module({
  imports: [
    PrismaModule,
    CategoryModule,
    GoodsModule,
    StoreOrderModule,
    FileModule,
    SettlementModule,
  ],
  controllers: [StoreController, CashierController],
  providers: [StoreService, CashierService],
  exports: [StoreService, CashierService],
})
export class StoreModule {}
