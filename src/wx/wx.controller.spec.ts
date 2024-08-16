import { Test, TestingModule } from '@nestjs/testing';
import { WxController } from './wx.controller';
import { WxService } from './wx.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderService } from '../order/order.service';
import { StoreService } from '../store/store.service';
import { GoodsService } from '../store/goods/goods.service';
import { CategoryService } from '../store/category/category.service';
import { AddressService } from '../users/address/address.service';
import { UsersService } from '../users/users.service';

describe('WxController', () => {
  let controller: WxController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WxController],
      providers: [
        WxService,
        PrismaService,
        OrderService,
        StoreService,
        GoodsService,
        CategoryService,
        AddressService,
        UsersService,
      ],
    }).compile();

    controller = module.get<WxController>(WxController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
