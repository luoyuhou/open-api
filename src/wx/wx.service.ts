import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { UpdateWxDto } from './dto/update-wx.dto';
import { UserEntity } from '../users/entities/user.entity';
import { CreateOrderDto } from '../order/dto/create-order.dto';
import { OrderService } from '../order/order.service';
import { Pagination } from '../common/dto/pagination';
import { E_USER_ORDER_STATUS } from '../order/const';
import { PrismaService } from '../prisma/prisma.service';
import { StoreService } from '../store/store.service';
import { GoodsService } from '../store/goods/goods.service';
import { CategoryService } from '../store/category/category.service';
import { AddressService } from '../users/address/address.service';
import { UpdateAddressDto } from '../users/address/dto/update-address.dto';
import { CreateAddressDto } from '../users/address/dto/create-address.dto';
import { UsersService } from '../users/users.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UpdateUserPasswordDto } from '../users/dto/update-user-password.dto';

@Injectable()
export class WxService {
  constructor(private prisma: PrismaService) {}

  @Inject(forwardRef(() => OrderService))
  private readonly orderService: OrderService;

  @Inject(forwardRef(() => StoreService))
  private readonly storeService: StoreService;

  @Inject(forwardRef(() => GoodsService))
  private readonly goodsService: GoodsService;

  @Inject(forwardRef(() => CategoryService))
  private readonly categoryService: CategoryService;

  @Inject(forwardRef(() => AddressService))
  private readonly addressService: AddressService;

  @Inject(forwardRef(() => UsersService))
  private readonly userService: UsersService;

  public async createOrder(user: UserEntity, createOrderDto: CreateOrderDto) {
    return this.orderService.create(user, createOrderDto);
  }

  public async orderPagination(pagination: Pagination) {
    return this.orderService.findAll(pagination);
  }

  public async cancelOrder(order_id: string, user: UserEntity) {
    return this.orderService.actionAdapter(
      order_id,
      E_USER_ORDER_STATUS.cancel,
      user,
    );
  }

  public async removeOrder(order_id: string, user: UserEntity) {
    return this.orderService.actionAdapter(
      order_id,
      E_USER_ORDER_STATUS.delete,
      user,
    );
  }

  public async orderDetailInfo(order_id: string) {
    return this.orderService.orderDetailInfo(order_id);
  }

  public async storePagination(pagination: Pagination) {
    return this.storeService.pagination(pagination);
  }

  public async storeInfo(store_id: string) {
    return this.storeService.findOne(store_id);
  }

  public async findCategoryByStoreId(args: { store_id: string; pid?: string }) {
    return this.categoryService.findAll(args);
  }

  public async goodsPagination(pagination: Pagination) {
    return this.goodsService.pagination(pagination);
  }

  public async createUserAddress(
    user: UserEntity,
    createAddressDto: CreateAddressDto,
  ) {
    return this.addressService.create(user, createAddressDto);
  }

  public async getUserAllAddress(user: UserEntity) {
    return this.addressService.findAll(user);
  }

  public async findUserAddress(address_id: string) {
    return this.addressService.findOne(address_id);
  }

  public async editUserAddress(
    address_id: string,
    data: UpdateAddressDto,
    user: UserEntity,
  ) {
    return this.addressService.update(address_id, data, user);
  }

  public async updateUserProfileWithPassword(
    user: UserEntity,
    profile: UpdateUserDto & UpdateUserPasswordDto,
  ) {
    return this.userService.updateUserProfileWithPassword(user, profile);
  }
}
