import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateStoreDto, CreateStoreInputDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { PrismaService } from '../prisma/prisma.service';
import { v4 } from 'uuid';
import { ApplicantStoreHistoryInputDto } from './dto/apply-store-history.dto';
import { STORE_ACTION_TYPES, STORE_STATUS_TYPES } from './const';
import { UserEntity } from '../users/entities/user.entity';
import { StoreEntity } from './entities/store.entity';
import { Pagination } from '../common/dto/pagination';
import { SearchStoreDto } from './dto/search-store.dto';
import { ApproverStoreDto } from './dto/approver-store.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}
  public async create(user: UserEntity, createStoreDto: CreateStoreInputDto) {
    const pendingStore = await this.prisma.store.findFirst({
      where: { user_id: user.user_id, status: STORE_STATUS_TYPES.PENDING },
    });

    if (pendingStore) {
      throw new BadRequestException(
        `您有一个商店 ${pendingStore.store_name} 正等待审核，请耐性等待`,
      );
    }

    const store_id = 'store-' + v4();
    const data: CreateStoreDto = new StoreEntity({
      store_id,
      status: 0,
      user_id: user.user_id,
      ...createStoreDto,
    });

    const history: ApplicantStoreHistoryInputDto = {
      store_id,
      action_type: STORE_ACTION_TYPES.APPLY,
      action_content: `${user.first_name} ${user.last_name} apply store name is ${createStoreDto.store_name}`,
      action_user_id: user.user_id,
      action_date: new Date(),
    };

    await this.prisma.$transaction([
      this.prisma.store.create({ data }),
      this.prisma.store_history.create({ data: history }),
    ]);

    return data;
  }

  public async previewApply(id: string, user: UserEntity) {
    const store = await this.prisma.store.findUnique({
      where: { status: STORE_STATUS_TYPES.PENDING, store_id: id },
    });

    if (!store) {
      throw new BadRequestException('未找到等待审批的商店申请');
    }

    await this.prisma.$transaction([
      this.prisma.store.update({
        where: { store_id: id },
        data: { status: STORE_STATUS_TYPES.PREVIEW },
      }),
      this.prisma.store_history.create({
        data: {
          store_id: id,
          action_type: STORE_ACTION_TYPES.PREVIEW,
          action_content: `${user.first_name} ${user.last_name} has been preview ${store.store_name} (${store.store_id})`,
          action_user_id: user.user_id,
          action_date: new Date(),
        },
      }),
    ]);
  }

  public async reviewApply(id: string, user: UserEntity) {
    const previewStore = await this.prisma.store.findUnique({
      where: { store_id: id },
    });

    if (!previewStore) {
      throw new BadRequestException('未找到等待 review 的 store 申请');
    }

    const storeHistory = await this.prisma.store_history.findFirst({
      where: { store_id: id },
      orderBy: { create_date: 'desc' },
    });

    if (
      previewStore.status === STORE_STATUS_TYPES.PENDING ||
      storeHistory?.action_type !== STORE_ACTION_TYPES.PREVIEW
    ) {
      throw new BadRequestException('请确定你是否预览并刷新页面，重新提交');
    }

    await this.prisma.$transaction([
      this.prisma.store.update({
        where: { store_id: id },
        data: { status: STORE_STATUS_TYPES.REVIEWED },
      }),
      this.prisma.store_history.create({
        data: {
          store_id: id,
          action_type: STORE_ACTION_TYPES.REVIEWED,
          action_content: `${user.first_name} ${user.last_name} has been review ${previewStore.store_name} (${storeHistory.store_id})`,
          action_user_id: user.user_id,
          action_date: new Date(),
        },
      }),
    ]);
  }

  public async approvedForApply(
    id: string,
    data: { replient_content: string },
    user: UserEntity,
  ) {
    const store = await this.prisma.store.findFirst({
      where: {
        store_id: id,
        status: STORE_STATUS_TYPES.REVIEWED,
      },
    });
    if (!store) {
      throw new BadRequestException('请确定你是否预览完成');
    }

    await this.prisma.$transaction([
      this.prisma.store.update({
        where: { store_id: id },
        data: { status: STORE_STATUS_TYPES.APPROVED },
      }),
      this.prisma.store_history.create({
        data: {
          store_id: id,
          action_user_id: user.user_id,
          action_date: new Date(),
          action_type: STORE_ACTION_TYPES.APPROVED,
          action_content: `${user.first_name} ${user.last_name} approved this store.`,
          payload: data.replient_content,
        },
      }),
    ]);
  }

  public async pagination(pagination: Pagination) {
    const { pageNum, pageSize, sorted, filtered } = pagination;
    const where = {};
    filtered.forEach(({ id, value }) => {
      if (
        [
          'store_id',
          'id_code',
          'id_name',
          'user_id',
          'status',
          'province',
          'city',
          'area',
          'town',
        ].includes(id)
      ) {
        where[id] = Array.isArray(value) ? { in: value } : value;
      }

      if (id === 'store_name' || id === 'address') {
        where[id] = { contains: value };
      }
    });

    const orderByKey =
      Array.isArray(sorted) && sorted.length ? sorted[0].id : 'create_date';
    const orderByValue =
      Array.isArray(sorted) && sorted.length
        ? sorted[0].desc
          ? 'desc'
          : 'acs'
        : 'desc';
    const count = await this.prisma.store.count({
      where: where,
    });
    const data = await this.prisma.store.findMany({
      where: where,
      take: pageSize,
      skip: pageNum * pageSize,
      orderBy: { [orderByKey]: orderByValue },
    });

    const storeIds = data.map(({ store_id }) => store_id);
    const names = await this.formatAreaName(storeIds);

    const formatData = data.map((d) => {
      const find = (names as { store_id: string }[]).find(
        ({ store_id }) => d.store_id === store_id,
      );
      return {
        ...d,
        ...(find || {}),
      };
    });

    return {
      data: formatData,
      rows: count,
      pages: Math.ceil(count / pageSize),
    };
  }

  private async formatAreaName(storeIds: string[]): Promise<
    {
      store_id: string;
      province_name: string;
      city_name: string;
      area_name: string;
      town_name: string;
    }[]
  > {
    if (!storeIds.length) {
      return [];
    }

    return this.prisma.$queryRaw`SELECT
          A.store_id,
          B1.name AS province_name,
          B2.name AS city_name,
          B3.name AS area_name,
          B4.name AS town_name
        FROM storehouse.store AS A
          LEFT JOIN storehouse.province AS B1 ON A.province = B1.code
          LEFT JOIN storehouse.province AS B2 ON A.city = B2.code
          LEFT JOIN storehouse.province AS B3 ON A.area = B3.code
            AND B3.town = 0
          LEFT JOIN storehouse.province AS B4 ON A.area = B4.code
            AND A.town = B4.town
        WHERE store_id IN (${Prisma.join(storeIds)})
        `;
  }

  public async findOne(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { store_id: id },
    });

    if (!store) {
      return store;
    }

    const names = await this.formatAreaName([store.store_id]);

    return { ...store, ...(names[0] || {}) };
  }

  public async findHistory(id: string, type?: string) {
    if (type) {
      return this.prisma.store_history.findMany({
        where: {
          store_id: id,
          action_type: { lte: STORE_ACTION_TYPES.APPROVED },
        },
        orderBy: { create_date: 'desc' },
      });
    }

    return this.prisma.store_history.findMany({
      where: { store_id: id },
      orderBy: { create_date: 'desc' },
    });

    // return this.prisma.$queryRaw`SELECT st.* FROM store_history as st
    //     LEFT JOIN store as s
    //     ON st.store_id = s.store_id
    //     WHERE st.store_id = '${id}'
    //     ORDER BY st.create_date desc`;
  }

  public async searchMany({ type, value }: SearchStoreDto) {
    if (type === 'name') {
      return this.prisma.store.findMany({
        where: { store_name: `%${value}%` },
      });
    }

    if (type === 'address') {
      const arr = value.split('_');
      if (arr.length < 3) {
        throw new BadRequestException('请输入更加详尽的地址');
      }
      const where = {
        status: STORE_STATUS_TYPES.APPROVED,
        province: arr[0],
        city: arr[1],
        area: arr[2],
      };
      if (arr.length > 4) {
        where['address'] = `%${arr[3]}%`;
      }
      return this.prisma.store.findMany({
        where,
      });
    }

    throw new BadRequestException(
      `未知类型 ${type}，当前仅仅支持 name, address 搜索`,
    );
  }

  public async transform(
    id: string,
    updateStoreDto: UpdateStoreDto,
    user: UserEntity,
  ) {
    return this.prisma.store_history.create({
      data: {
        store_id: id,
        action_type: STORE_ACTION_TYPES.TRANSFORM,
        action_content: '',
        action_user_id: user.user_id,
        action_date: new Date(),
      },
    });
  }

  public async update(
    id: string,
    updateStoreDto: UpdateStoreDto,
    user: UserEntity,
  ) {
    await this.prisma.$transaction([
      this.prisma.store.update({
        where: { store_id: id },
        data: updateStoreDto,
      }),
      this.prisma.store_history.create({
        data: {
          store_id: id,
          action_content: ``,
          action_type: STORE_ACTION_TYPES.UPDATED,
          action_date: new Date(),
          action_user_id: user.user_id,
        },
      }),
    ]);
  }

  public async approve(id: number) {
    return `This action removes a #${id} store`;
  }

  public async frozen(id: string, user: UserEntity) {
    const store = await this.prisma.store.findUnique({
      where: { store_id: id },
    });
    if (!store) {
      throw new BadRequestException('未找到 store');
    }

    if (store.status === STORE_STATUS_TYPES.FROZEN) {
      return;
    }

    return this.prisma.$transaction([
      this.prisma.store.update({
        where: { store_id: id },
        data: { status: STORE_STATUS_TYPES.FROZEN },
      }),
      this.prisma.store_history.create({
        data: {
          store_id: id,
          action_type: STORE_ACTION_TYPES.FROZEN,
          action_user_id: user.user_id,
          action_date: new Date(),
          action_content: `${user.first_name} ${user.last_name} has been frozen store`,
        },
      }),
    ]);
  }

  public async adapter(
    { store_id, status }: ApproverStoreDto,
    user: UserEntity,
  ) {
    if (status === STORE_STATUS_TYPES.PREVIEW) {
      return this.previewApply(store_id, user);
    }

    if (status === STORE_STATUS_TYPES.REVIEWED) {
      return this.reviewApply(store_id, user);
    }

    if (status === STORE_STATUS_TYPES.APPROVED) {
      return this.approvedForApply(
        store_id,
        { replient_content: `approved` },
        user,
      );
    }

    if (status === STORE_STATUS_TYPES.FROZEN) {
      return this.frozen(store_id, user);
    }
  }

  public async findAllApprovedStoresBySessionUser(user: UserEntity) {
    const stores = await this.prisma.store.findMany({
      where: {
        user_id: user.user_id,
        status: { gte: STORE_STATUS_TYPES.APPROVED },
      },
    });

    const ids = stores.map(({ store_id }) => store_id);

    const names = await this.formatAreaName(ids);

    return stores.map((s) => {
      const find = names.find(({ store_id }) => store_id === s.store_id);
      return { ...s, ...(find || {}) };
    });
  }
}
