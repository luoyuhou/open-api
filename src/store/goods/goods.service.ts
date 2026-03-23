import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateGoodDto } from './dto/create-good.dto';
import { UpdateGoodDto } from './dto/update-good.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { FileService } from '../../file/file.service';
import { StoreResourceService } from '../store-resource/store-resource.service';
import { E_GOODS_STATUS, E_GOODS_VERSION_STATUS } from './const';
import { v4 } from 'uuid';
import { CreateGoodsVersionDto } from './dto/create-goods-version.dto';
import { UpdateGoodsVersionDto } from './dto/update-goods-version.dto';
import { Pagination } from '../../common/dto/pagination';
import { UpsertGoodsVersionDto } from './dto/upsert-goods-version.dto';
import customLogger from '../../common/logger';
import Utils from '../../common/utils';

@Injectable()
export class GoodsService {
  constructor(
    private prisma: PrismaService,
    private fileService: FileService,
    private storeResourceService: StoreResourceService,
  ) {}

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

    const where = Utils.formatWhereByPagination(pagination.filtered);
    const count = await this.prisma.store_goods.count({ where });
    const searchPayload = {
      where: where,
      take: pageSize,
      skip: pageNum * pageSize,
    };
    if (sorted.length) {
      searchPayload['orderBy'] = {
        [sorted[0].id]: sorted[0].desc ? 'desc' : 'asc',
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
        `SELECT goods_id, count(1) count FROM store_goods_version WHERE goods_id IN (` +
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

  async create(
    {
      store_id,
      name,
      category_id,
      description,
      ...createGoodDto
    }: CreateGoodDto &
      CreateGoodsVersionDto & { image_url?: string; image_hash?: string },
    file?: Express.Multer.File,
  ) {
    if (file) {
      // 检查图片资源额度
      await this.checkResourceQuota(store_id, file.size);

      const { url, hash } = await this.fileService.uploadFile(
        file.buffer,
        file.originalname,
      );
      createGoodDto.image_url = url;
      createGoodDto.image_hash = hash;
    }

    const goods = await this.prisma.store_goods.findFirst({
      where: { store_id, category_id, name },
    });

    try {
      return this.prisma.$transaction(async (prisma) => {
        let goodsId: string;
        if (!goods) {
          goodsId = `goods-${v4()}`;
          await prisma.store_goods.create({
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

        if (createGoodDto.version_number) {
          const goodsVersion = await prisma.store_goods_version.findFirst({
            where: {
              goods_id: goodsId,
              unit_name: createGoodDto.unit_name,
              version_number: createGoodDto.version_number,
            },
          });

          if (goodsVersion) {
            throw new BadRequestException(
              `该批次 ${createGoodDto.version_number}/${createGoodDto.unit_name} 已经创建`,
            );
          }
        }

        const version_id = `version-${v4()}`;

        return prisma.store_goods_version.create({
          data: {
            goods_id: goodsId,
            supplier: createGoodDto.supplier,
            unit_name: createGoodDto.unit_name,
            image_url: createGoodDto.image_url,
            image_hash: createGoodDto.image_hash,
            price: Number(createGoodDto.price),
            count: Number(createGoodDto.count),
            version_id,
            status: E_GOODS_VERSION_STATUS.active,
          } as any,
        });
      });
    } catch (e) {
      customLogger.error({
        summary: '创建商品失败',
        store_id,
        goods_name: name,
        unit_name: createGoodDto.unit_name,
        error: e.message,
      });
      throw e;
    }
  }

  async findAll(id: string) {
    return this.prisma.store_goods.findMany({ where: { category_id: id } });
  }

  async findOne(goods_id: string) {
    const goods = await this.prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT a.*, b.store_name AS store_name, c.name AS category_name FROM store_goods a
        JOIN store b ON a.store_id = b.store_id
        JOIN category_goods c ON a.category_id = c.category_id
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
    {
      version_id,
      ...upsertGoodsVersionDto
    }: UpsertGoodsVersionDto & { image_url?: string; image_hash?: string },
    file?: Express.Multer.File,
  ) {
    let store_id: string | null = null;

    if (file) {
      // 1. 获取 store_id
      const goods = await this.prisma.store_goods.findUnique({
        where: { goods_id },
        select: { store_id: true },
      });
      if (!goods) {
        throw new BadRequestException('商品不存在');
      }
      store_id = goods.store_id;

      // 2. 检查图片资源额度
      await this.checkResourceQuota(store_id, file.size);

      const { url, hash } = await this.fileService.uploadFile(
        file.buffer,
        file.originalname,
      );
      upsertGoodsVersionDto.image_url = url;
      upsertGoodsVersionDto.image_hash = hash;
    }

    if (version_id) {
      const result = await this.prisma.store_goods_version.update({
        where: { version_id },
        data: upsertGoodsVersionDto,
      });

      // 如果更新了图片，使缓存失效
      if (file && store_id) {
        await this.storeResourceService.invalidateUsedQuota(store_id);
      }

      return result;
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

    return this.prisma.store_goods_version.create({
      data: {
        goods_id,
        ...createGoodsVersionDto,
        price: Number(createGoodsVersionDto.price),
        count: Number(createGoodsVersionDto.count),
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

  /**
   * 检查商店图片资源额度
   */
  private async checkResourceQuota(storeId: string, incomingSize: number) {
    // 1. 获取当前限额配置
    let resource = await this.prisma.store_resource.findUnique({
      where: { store_id: storeId },
    });

    if (!resource) {
      // 如果不存在，初始化一个（10MB）
      resource = await this.prisma.store_resource.create({
        data: {
          store_id: storeId,
          total_quota: BigInt(10 * 1024 * 1024),
        },
      });
    }

    // 2. 获取当前已用额度（从 Redis 缓存或数据库计算）
    const usedSize = await this.storeResourceService.getUsedQuota(storeId);

    // 3. 校验
    if (usedSize + incomingSize > Number(resource.total_quota)) {
      const totalMB = Number(resource.total_quota) / (1024 * 1024);
      const usedMB = (usedSize / (1024 * 1024)).toFixed(2);
      throw new BadRequestException(
        `图片资源额度不足。当前配额：${totalMB}MB，已使用：${usedMB}MB。请购买额外额度。`,
      );
    }

    // 4. 预占额度（更新缓存，实际值会在下次查询时重新计算）
    // 使缓存失效，下次查询时会重新计算准确的值
    await this.storeResourceService.invalidateUsedQuota(storeId);
  }
}
