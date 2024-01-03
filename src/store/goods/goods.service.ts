import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateGoodDto } from './dto/create-good.dto';
import { UpdateGoodDto } from './dto/update-good.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { E_GOODS_STATUS, E_GOODS_VERSION_STATUS } from './const';
import { v4 } from 'uuid';
import { CreateGoodsVersionDto } from './dto/create-goods-version.dto';
import { UpdateGoodsVersionDto } from './dto/update-goods-version.dto';

@Injectable()
export class GoodsService {
  constructor(private prisma: PrismaService) {}

  async create(createGoodDto: CreateGoodDto) {
    const goods = await this.prisma.category_goods.findFirst({
      where: { store_id: createGoodDto.store_id, name: createGoodDto.name },
    });

    if (goods) {
      throw new BadRequestException(`商品 ${createGoodDto.name} 已经存在`);
    }

    const goodsId = `goods-${v4()}`;

    return this.prisma.store_goods.create({
      data: {
        ...createGoodDto,
        goods_id: goodsId,
        status: E_GOODS_STATUS.active,
      },
    });
  }

  async findAll(id: string) {
    return this.prisma.store_goods.findMany({ where: { category_id: id } });
  }

  async findOne(id: string) {
    const goods = await this.prisma.store_goods.findFirst({
      where: { goods_id: id },
    });

    const versions = await this.prisma.store_goods_version.findMany({
      where: { goods_id: id },
    });

    return { goods, versions };
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

  async createGoodsVersion(createGoodsVersionDto: CreateGoodsVersionDto) {
    if (createGoodsVersionDto.version_number) {
      const goodsVersion = await this.prisma.store_goods_version.findFirst({
        where: {
          goods_id: createGoodsVersionDto.goods_id,
          version_number: createGoodsVersionDto.version_number,
        },
      });

      if (goodsVersion) {
        throw new BadRequestException('');
      }
    }

    const version_id = `version-${v4()}`;
    const version_number = `${new Date().getTime()}.${Math.random()}`;

    const data = createGoodsVersionDto.version_number
      ? createGoodsVersionDto
      : { ...createGoodsVersionDto, version_number };

    return this.prisma.store_goods_version.create({
      data: {
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
