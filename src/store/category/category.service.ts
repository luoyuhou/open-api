import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 } from 'uuid';
import { E_CATEGORY_STATUS_TYPE } from './const';
import { FindAllCategoryDto } from './dto/findAll-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create({ store_id, pid, name }: CreateCategoryDto) {
    const category = await this.prisma.category_goods.findFirst({
      where: { store_id, name },
    });

    if (category) {
      throw new BadRequestException(`${name} 分类已经创建`);
    }

    const categoryId = `category-${v4()}`;

    const lastCategory = await this.prisma.category_goods.findFirst({
      where: { pid },
      orderBy: { rank: 'desc' },
    });

    return this.prisma.category_goods.create({
      data: {
        category_id: categoryId,
        store_id,
        pid: pid ?? '0',
        rank: lastCategory?.rank ? lastCategory.rank + 1 : 0,
        name,
        status: E_CATEGORY_STATUS_TYPE.active,
      },
    });
  }

  public async switchRank({
    categoryId1,
    categoryId2,
  }: {
    categoryId1: string;
    categoryId2: string;
  }) {
    const category1 = await this.prisma.category_goods.findUnique({
      where: { category_id: categoryId1 },
    });
    if (!category1) {
      throw new BadRequestException(`分类 ${categoryId1} 不存在`);
    }
    const category2 = await this.prisma.category_goods.findUnique({
      where: { category_id: categoryId2 },
    });
    if (!category2) {
      throw new BadRequestException(`分类 ${categoryId2} 不存在`);
    }

    if (category1.store_id !== category2.store_id) {
      throw new BadRequestException('错误的请求, 请刷新页面重拾');
    }

    if (category1.pid !== category2.pid) {
      throw new BadRequestException(
        `${categoryId1}, ${categoryId2} 不是同一分类的子集`,
      );
    }

    return this.prisma.$transaction([
      this.prisma.category_goods.update({
        where: { category_id: category1.category_id },
        data: { rank: category2.rank },
      }),
      this.prisma.category_goods.update({
        where: { category_id: category2.category_id },
        data: { rank: category1.rank },
      }),
    ]);
  }

  async switchCategory({
    parent_category_id,
    category_id,
  }: {
    category_id: string;
    parent_category_id?: string;
  }) {
    const category = await this.prisma.category_goods.findUnique({
      where: { category_id },
    });
    if (!category) {
      throw new BadRequestException(`分类 ${category_id} 不存在`);
    }
    if (!parent_category_id) {
      return this.prisma.category_goods.update({
        where: { category_id },
        data: { pid: '0' },
      });
    }

    const parentCategory = await this.prisma.category_goods.findUnique({
      where: { category_id: parent_category_id },
    });

    if (!parentCategory) {
      throw new BadRequestException(`父分类 ${category_id} 不存在`);
    }

    if (category.store_id !== parentCategory.store_id) {
      throw new BadRequestException('错误的请求, 请刷新页面重拾');
    }

    const lastChildren = await this.prisma.category_goods.findFirst({
      where: {
        store_id: parentCategory.store_id,
        pid: parentCategory.category_id,
      },
      orderBy: { rank: 'desc' },
    });

    return this.prisma.category_goods.update({
      where: { category_id: category_id },
      data: {
        pid: parent_category_id,
        rank: lastChildren ? lastChildren.rank + 1 : 0,
      },
    });
  }

  findAll({ store_id, pid }: FindAllCategoryDto) {
    return this.prisma.category_goods.findMany({ where: { store_id, pid } });
  }

  findOne(id: number) {
    return `This action returns a #${id} category`;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category_goods.findUnique({
      where: { category_id: id, status: E_CATEGORY_STATUS_TYPE.active },
    });

    if (!category) {
      throw new BadRequestException('');
    }
    return this.prisma.category_goods.update({
      where: { category_id: id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category_goods.findUnique({
      where: { category_id: id, status: E_CATEGORY_STATUS_TYPE.active },
    });

    if (!category) {
      throw new BadRequestException('');
    }
    return this.prisma.category_goods.update({
      where: { category_id: id },
      data: { status: E_CATEGORY_STATUS_TYPE.inactive },
    });
  }

  async reactive(id: string) {
    const category = await this.prisma.category_goods.findUnique({
      where: { category_id: id, status: E_CATEGORY_STATUS_TYPE.inactive },
    });

    if (!category) {
      throw new BadRequestException('');
    }
    return this.prisma.category_goods.update({
      where: { category_id: id },
      data: { status: E_CATEGORY_STATUS_TYPE.active },
    });
  }
}
