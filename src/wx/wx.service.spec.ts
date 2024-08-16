import { Test, TestingModule } from '@nestjs/testing';
import { WxService } from './wx.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderService } from '../order/order.service';
import { StoreService } from '../store/store.service';
import { GoodsService } from '../store/goods/goods.service';
import { CategoryService } from '../store/category/category.service';
import { AddressService } from '../users/address/address.service';
import { UsersService } from '../users/users.service';

describe('WxService', () => {
  let service: WxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<WxService>(WxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
