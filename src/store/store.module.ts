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
import { MemberModule } from './member/member.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    PrismaModule,
    CategoryModule,
    GoodsModule,
    StoreOrderModule,
    FileModule,
    SettlementModule,
    MemberModule,
    StaffModule,
  ],
  controllers: [StoreController, CashierController],
  providers: [StoreService, CashierService],
  exports: [StoreService, CashierService],
})
export class StoreModule {}
