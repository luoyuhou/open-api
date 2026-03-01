import { forwardRef, Inject, Injectable } from '@nestjs/common';
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
import { STORE_STATUS_TYPES } from '../store/const';

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

  public async homeBannersForMiniApp() {
    return this.prisma.home_banner.findMany({
      where: { status: 1 },
      orderBy: [{ sort: 'asc' }, { create_date: 'desc' }],
    });
  }

  /**
   * 小程序首页推荐商家
   * 逻辑：从预计算好的 store_rating 表中读取评分和订单数，按评分倒序分页
   */
  public async recommendStoresForMiniApp(pageNum: number, pageSize: number) {
    const take = pageSize;
    const skip = pageNum * pageSize;

    // 统计符合条件的门店总数（有评分，且门店处于已审核/营业状态）
    const totalRows = await this.prisma.$queryRaw<
      { total: bigint }[]
    >`SELECT COUNT(*) AS total
      FROM store AS s
      INNER JOIN store_rating AS r ON s.store_id = r.store_id
      WHERE s.status >= ${STORE_STATUS_TYPES.APPROVED}`;

    const total = Number(totalRows[0]?.total || 0);

    // 从 store_rating 读取评分和订单数，按评分倒序分页
    const stores = await this.prisma.$queryRaw<any[]>`
      SELECT
        s.store_id,
        s.store_name,
        s.address,
        s.province,
        s.city,
        s.area,
        s.town,
        s.status,
        r.order_count,
        r.rating,
        r.avg_star
      FROM store AS s
      INNER JOIN store_rating AS r ON s.store_id = r.store_id
      WHERE s.status >= ${STORE_STATUS_TYPES.APPROVED}
      ORDER BY r.rating DESC, s.create_date DESC
      LIMIT ${skip}, ${take}
    `;

    return {
      rows: total,
      pages: Math.ceil(total / pageSize),
      data: stores,
    };
  }

  /**
   * 查询用户收藏店铺状态
   * @param user
   * @param store_id
   */
  public async isFavoriteStore(user: UserEntity, store_id: string) {
    const raw = user as any;
    const realUser = raw?.user || raw;
    const userId = realUser.user_id;

    const data = await this.prisma.user_favorite_store.findFirst({
      where: { user_id: userId, store_id },
    });

    return !!data;
  }

  /**
   * 用户收藏店铺：添加收藏
   */
  public async addFavoriteStore(user: UserEntity, store_id: string) {
    const raw = user as any;
    const realUser = raw?.user || raw;
    const userId = realUser.user_id;

    const now = new Date();
    await this.prisma.user_favorite_store.upsert({
      where: {
        user_id_store_id: { user_id: userId, store_id },
      },
      update: { update_date: now },
      create: { user_id: userId, store_id },
    });
  }

  /**
   * 用户收藏店铺：取消收藏
   */
  public async removeFavoriteStore(user: UserEntity, store_id: string) {
    const raw = user as any;
    const realUser = raw?.user || raw;
    const userId = realUser.user_id;

    await this.prisma.user_favorite_store.deleteMany({
      where: { user_id: userId, store_id },
    });
  }

  /**
   * 用户收藏店铺列表（分页）
   */
  public async listFavoriteStores(
    user: UserEntity,
    pageNum: number,
    pageSize: number,
  ) {
    const raw = user as any;
    const realUser = raw?.user || raw;
    const userId =
      realUser?.user_id || realUser?.userId || `${realUser?.id || ''}`;
    if (!userId) {
      return { rows: 0, pages: 0, data: [] };
    }

    const take = pageSize;
    const skip = pageNum * pageSize;

    const totalRows = await this.prisma.$queryRaw<
      { total: bigint }[]
    >`SELECT COUNT(*) AS total
      FROM user_favorite_store AS f
      WHERE f.user_id = ${userId}`;

    const total = Number(totalRows[0]?.total || 0);

    if (!total) {
      return { rows: 0, pages: 0, data: [] };
    }

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        f.store_id,
        f.update_date,
        s.store_name,
        s.address,
        s.province,
        s.city,
        s.area,
        s.town,
        B1.name AS province_name,
        B2.name AS city_name,
        B3.name AS area_name,
        B4.name AS town_name,
        r.order_count,
        r.avg_star,
        r.rating
      FROM user_favorite_store AS f
      LEFT JOIN store AS s ON f.store_id = s.store_id
      LEFT JOIN province AS B1 ON s.province = B1.code
      LEFT JOIN province AS B2 ON s.city = B2.code
      LEFT JOIN province AS B3 ON s.area = B3.code AND B3.town = 0
      LEFT JOIN province AS B4 ON s.area = B4.code AND s.town = B4.town
      LEFT JOIN store_rating AS r ON s.store_id = r.store_id
      WHERE f.user_id = ${userId}
      ORDER BY f.update_date DESC
      LIMIT ${skip}, ${take}
    `;

    return {
      rows: total,
      pages: Math.ceil(total / pageSize),
      data: rows,
    };
  }

  /**
   * 记录用户浏览店铺
   */
  public async recordStoreBrowse(user: UserEntity, store_id: string) {
    const raw = user as any;
    const realUser = raw?.user || raw;
    const userId = realUser.user_id;

    const now = new Date();
    await this.prisma.user_store_browse_history.upsert({
      where: {
        user_id_store_id: { user_id: userId, store_id },
      },
      update: { visit_date: now, update_date: now },
      create: { user_id: userId, store_id, visit_date: now },
    });
  }

  /**
   * 用户浏览店铺记录列表（分页）
   */
  public async listStoreBrowseHistory(
    user: UserEntity,
    pageNum: number,
    pageSize: number,
  ) {
    const raw = user as any;
    const realUser = raw?.user || raw;
    const userId = realUser.user_id;
    if (!userId) {
      return { rows: 0, pages: 0, data: [] };
    }

    const take = pageSize;
    const skip = pageNum * pageSize;

    const totalRows = await this.prisma.$queryRaw<
      { total: bigint }[]
    >`SELECT COUNT(*) AS total
      FROM user_store_browse_history AS h
      WHERE h.user_id = ${userId}`;

    const total = Number(totalRows[0]?.total || 0);

    if (!total) {
      return { rows: 0, pages: 0, data: [] };
    }

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        h.store_id,
        h.visit_date,
        s.store_name,
        s.address,
        s.province,
        s.city,
        s.area,
        s.town,
        B1.name AS province_name,
        B2.name AS city_name,
        B3.name AS area_name,
        B4.name AS town_name,
        r.order_count,
        r.avg_star,
        r.rating
      FROM user_store_browse_history AS h
      LEFT JOIN store AS s ON h.store_id = s.store_id
      LEFT JOIN province AS B1 ON s.province = B1.code
      LEFT JOIN province AS B2 ON s.city = B2.code
      LEFT JOIN province AS B3 ON s.area = B3.code AND B3.town = 0
      LEFT JOIN province AS B4 ON s.area = B4.code AND s.town = B4.town
      LEFT JOIN store_rating AS r ON s.store_id = r.store_id
      WHERE h.user_id = ${userId}
      ORDER BY h.visit_date DESC
      LIMIT ${skip}, ${take}
    `;

    return {
      rows: total,
      pages: Math.ceil(total / pageSize),
      data: rows,
    };
  }

  /**
   * 删除用户浏览店铺记录
   */
  public async deleteStoreBrowseHistory(user: UserEntity, store_id: string) {
    const raw = user as any;
    const realUser = raw?.user || raw;
    const userId = realUser.user_id;

    await this.prisma.user_store_browse_history.deleteMany({
      where: { user_id: userId, store_id },
    });
  }
}
