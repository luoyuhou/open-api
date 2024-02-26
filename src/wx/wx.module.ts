import { Module } from '@nestjs/common';
import { WxService } from './wx.service';
import { WxController } from './wx.controller';

@Module({
  controllers: [WxController],
  providers: [WxService],
})
export class WxModule {}
