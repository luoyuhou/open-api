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
      action_type: STORE_ACTION_TYPES.apply,
      action_content: `${user.first_name} ${user.last_name} apply store name is ${createStoreDto.store_name}`,
      applicant_user_id: user.user_id,
      applicant_date: new Date(),
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
          action_type: STORE_ACTION_TYPES.review,
          action_content: `${user.first_name} ${user.last_name} has been preview ${store.store_name} (${store.store_id})`,
          applicant_user_id: user.user_id,
          applicant_date: new Date(),
        },
      }),
    ]);
  }

  public async reviewApply(
    id: string,
    data: { message: string },
    user: UserEntity,
  ) {
    const previewStore = await this.prisma.store.findUnique({
      where: { store_id: id },
    });

    if (!previewStore) {
      throw new BadRequestException('未找到等待 review 的 store 申请');
    }

    const storeHistory = await this.prisma.store_history.findFirst({
      where: { store_id: id, action_type: STORE_ACTION_TYPES.review },
      orderBy: { create_date: 'desc' },
    });

    if (previewStore.status === STORE_STATUS_TYPES.PENDING || !storeHistory) {
      throw new BadRequestException('请确定你是否预览并刷新页面，重新提交');
    }

    await this.prisma.$transaction([
      this.prisma.store.update({
        where: { store_id: id },
        data: { status: STORE_STATUS_TYPES.REVIEWED },
      }),
      this.prisma.store_history.update({
        where: { id: storeHistory.id },
        data: {
          replient_user_id: user.user_id,
          replient_content: `${user.first_name} ${user.last_name} has been review ${previewStore.store_name} (${storeHistory.store_id})`,
          replient_date: new Date(),
        },
      }),
    ]);
  }

  public async approvedForApply(
    id: string,
    data: { replient_content: string },
    user: UserEntity,
  ) {
    const lastStoreHistory = await this.prisma.store_history.findFirst({
      where: {
        store_id: id,
      },
    });
    if (!lastStoreHistory) {
      throw new BadRequestException('');
    }

    if (lastStoreHistory.action_type !== STORE_ACTION_TYPES.apply) {
      throw new BadRequestException('');
    }

    if (lastStoreHistory.replient_content) {
      throw new BadRequestException('');
    }

    await this.prisma.$transaction([
      this.prisma.store.update({
        where: { store_id: id },
        data: { status: 1 },
      }),
      this.prisma.store_history.update({
        where: { id: lastStoreHistory.id },
        data: {
          replient_date: new Date(),
          replient_user_id: user.user_id,
          replient_content: `${user.first_name} ${user.last_name} approved this store. content: ${data.replient_content}`,
        },
      }),
    ]);
  }

  public async pagination(pagination: Pagination) {
    const { pageNum, pageSize, sorted, filtered } = pagination;
    const where = {};
    filtered.forEach(({ id, value }) => {
      if (
        ['store_id', 'id_code', 'id_name', 'user_id', 'status'].includes(id)
      ) {
        where[id] = Array.isArray(value) ? `IN (${value})` : value;
        return;
      }

      if (id === 'store_name' || id === 'address') {
        where[id] = Array.isArray(value)
          ? `IN (${value})`
          : `LIKE '%${value}%'`;
        return;
      }

      if (['province', 'city', 'area'].includes(id)) {
        where[id] = Array.isArray(value) ? `IN (${value})` : value;
        return;
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
      take: pageNum,
      skip: (pageNum + 1) * pageSize,
      orderBy: { [orderByKey]: orderByValue },
    });

    return { data, rows: count, pages: Math.ceil(count / pageSize) };
  }

  public async findOne(id: string) {
    return this.prisma.store.findUnique({ where: { store_id: id } });
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
        action_type: STORE_ACTION_TYPES.transform,
        action_content: '',
        applicant_user_id: user.user_id,
        applicant_date: new Date(),
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
          action_type: STORE_ACTION_TYPES.apply,
          applicant_date: new Date(),
          applicant_user_id: user.user_id,
        },
      }),
    ]);
  }

  public async approve(id: number) {
    return `This action removes a #${id} store`;
  }

  public async frozen() {
    return '';
  }
}
