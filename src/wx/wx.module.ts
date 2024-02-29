import { Module } from '@nestjs/common';
import { WxService } from './wx.service';
import { WxController } from './wx.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderModule } from '../order/order.module';
import { GoodsModule } from '../store/goods/goods.module';
import { StoreModule } from '../store/store.module';
import { CategoryModule } from '../store/category/category.module';
import { AddressModule } from '../users/address/address.module';

@Module({
  imports: [
    PrismaModule,
    OrderModule,
    GoodsModule,
    StoreModule,
    CategoryModule,
    AddressModule,
  ],
  controllers: [WxController],
  providers: [WxService],
})
export class WxModule {}
