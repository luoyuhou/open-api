import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateGoodDto } from './dto/create-good.dto';
import { UpdateGoodDto } from './dto/update-good.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { E_GOODS_STATUS, E_GOODS_VERSION_STATUS } from './const';
import { v4 } from 'uuid';
import { CreateGoodsVersionDto } from './dto/create-goods-version.dto';
import { UpdateGoodsVersionDto } from './dto/update-goods-version.dto';
import { Pagination } from '../../common/dto/pagination';
import { UpsertGoodsVersionDto } from './dto/upsert-goods-version.dto';

@Injectable()
export class GoodsService {
  constructor(private prisma: PrismaService) {}

  public async pagination(pagination: Pagination) {
    const { filtered, pageNum, pageSize, sorted } = pagination;
    const havingStoreId = filtered.some(({ id, value }) => {
      if (id !== 'store_id') {
        return false;
      }
      if (Array.isArray(value)) {
        return !!value.length;
      }

      return !!value;
    });

    if (!havingStoreId) {
      return { data: [], rows: 0, pages: 0 };
    }

    const where = {};
    filtered.forEach(({ id, value }) => {
      if (value === undefined || (Array.isArray(value) && !value.length)) {
        return;
      }
      if (Array.isArray(value) && value.length) {
        where[id] = { in: value };
        return;
      }
      where[id] = value;
    });
    const count = await this.prisma.store_goods.count({ where });
    const searchPayload = {
      where: where,
      take: pageSize,
      skip: pageNum * pageSize,
    };
    if (sorted.length) {
      searchPayload['orderBy'] = {
        [sorted[0].id]: sorted[0].desc ? 'desc' : 'acs',
      };
    }
    const data = await this.prisma.store_goods.findMany(searchPayload);
    const stores = await this.prisma.store.findMany({
      where: { store_id: { in: data.map(({ store_id }) => store_id) } },
    });
    const categories = await this.prisma.category_goods.findMany({
      where: {
        category_id: { in: data.map(({ category_id }) => category_id) },
      },
    });

    // const sqlQuery = `SELECT * FROM table WHERE column IN (${params.map(p => `'${p}'`).join(',')})`;
    const goodsIds = data.map(({ goods_id }) => `'${goods_id}'`);

    // const ids = 'goods-6d662ec5-dade-4e5d-b90d-bf96b1b04224';
    const versions: { goods_id: string; count: number }[] =
      await this.prisma.$queryRawUnsafe(
        `SELECT goods_id, count(1) count FROM storehouse.store_goods_version WHERE goods_id IN (` +
          goodsIds.join(',') +
          ') GROUP BY goods_id',
      );

    const formatData = data.map((item) => {
      const store = stores.find((s) => s.store_id === item.store_id);
      const category = categories.find(
        (c) => c.category_id === item.category_id,
      );
      const versionCnt = versions.find((v) => v.goods_id === item.goods_id);
      return {
        ...item,
        store_name: store ? store.store_name : undefined,
        category_name: category ? category.name : undefined,
        versions: versionCnt ? Number(versionCnt.count.toString()) : undefined,
      };
    });

    return {
      data: formatData,
      rows: count,
      pages: Math.ceil(count / pageSize),
    };
  }

  public async goodsVersions(goods_id: string) {
    return this.prisma.store_goods_version.findMany({ where: { goods_id } });
  }

  async create({
    store_id,
    name,
    category_id,
    description,
    ...createGoodDto
  }: CreateGoodDto & CreateGoodsVersionDto) {
    const goods = await this.prisma.store_goods.findFirst({
      where: { store_id, category_id, name },
    });

    let goodsId: string;
    if (!goods) {
      goodsId = `goods-${v4()}`;
      await this.prisma.store_goods.create({
        data: {
          store_id,
          category_id,
          name,
          description,
          goods_id: goodsId,
          status: E_GOODS_STATUS.active,
        },
      });
    } else {
      goodsId = goods.goods_id;
    }

    return this.createGoodsVersion(goodsId, createGoodDto);
  }

  async findAll(id: string) {
    return this.prisma.store_goods.findMany({ where: { category_id: id } });
  }

  async findOne(goods_id: string) {
    const goods = await this.prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT a.*, b.store_name AS store_name, c.name AS category_name FROM storehouse.store_goods a
        JOIN storehouse.store b ON a.store_id = b.store_id
        JOIN storehouse.category_goods c ON a.category_id = c.category_id
        WHERE a.goods_id = '${goods_id}' LIMIT 1`,
    );

    return goods.map((item) => ({
      ...item,
      id: Number(item.id.toString()),
    }))[0];
  }

  async update(id: string, updateGoodDto: UpdateGoodDto) {
    const goods = await this.prisma.store_goods.findFirst({
      where: { goods_id: id },
    });
    if (!goods) {
      throw new BadRequestException('');
    }

    return this.prisma.store_goods.update({
      where: { goods_id: id },
      data: updateGoodDto,
    });
  }

  async remove(id: string) {
    const goods = await this.prisma.store_goods.findFirst({
      where: { goods_id: id, status: E_GOODS_STATUS.active },
    });
    if (!goods) {
      throw new BadRequestException('');
    }

    return this.prisma.store_goods.update({
      where: { goods_id: id },
      data: { status: E_GOODS_STATUS.inactive },
    });
  }

  async reactive(id: string) {
    const goods = await this.prisma.store_goods.findFirst({
      where: { goods_id: id, status: E_GOODS_STATUS.inactive },
    });
    if (!goods) {
      throw new BadRequestException('');
    }

    return this.prisma.store_goods.update({
      where: { goods_id: id },
      data: { status: E_GOODS_STATUS.active },
    });
  }

  async upsertGoodsVersion(
    goods_id: string,
    { version_id, ...upsertGoodsVersionDto }: UpsertGoodsVersionDto,
  ) {
    if (version_id) {
      return this.prisma.store_goods_version.update({
        where: { version_id },
        data: upsertGoodsVersionDto,
      });
    }

    return this.createGoodsVersion(goods_id, upsertGoodsVersionDto);
  }

  async createGoodsVersion(
    goods_id: string,
    createGoodsVersionDto: CreateGoodsVersionDto,
  ) {
    if (createGoodsVersionDto.version_number) {
      const goodsVersion = await this.prisma.store_goods_version.findFirst({
        where: {
          goods_id: goods_id,
          unit_name: createGoodsVersionDto.unit_name,
          version_number: createGoodsVersionDto.version_number,
        },
      });

      if (goodsVersion) {
        throw new BadRequestException(
          `该批次 ${createGoodsVersionDto.version_number} 已经创建`,
        );
      }
    }

    const version_id = `version-${v4()}`;
    const version_number = `${new Date().getTime()}.${Math.random()}`;

    const data = createGoodsVersionDto.version_number
      ? createGoodsVersionDto
      : { ...createGoodsVersionDto, version_number };

    return this.prisma.store_goods_version.create({
      data: {
        goods_id,
        ...data,
        version_id,
        status: E_GOODS_VERSION_STATUS.active,
      },
    });
  }

  async updateGoodsVersion(
    id: string,
    updateGoodsVersion: UpdateGoodsVersionDto,
  ) {
    const goodsVersion = await this.prisma.store_goods_version.findUnique({
      where: { version_id: id },
    });

    if (!goodsVersion) {
      throw new BadRequestException('');
    }

    return this.prisma.store_goods_version.update({
      where: { version_id: id },
      data: updateGoodsVersion,
    });
  }
}
