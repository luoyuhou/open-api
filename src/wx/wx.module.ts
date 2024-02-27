import { Module } from '@nestjs/common';
import { WxService } from './wx.service';
import { WxController } from './wx.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [PrismaModule, OrderModule],
  controllers: [WxController],
  providers: [WxService],
})
export class WxModule {}
