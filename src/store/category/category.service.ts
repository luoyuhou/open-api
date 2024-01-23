import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 } from 'uuid';
import { E_CATEGORY_STATUS_TYPE } from './const';
import { FindAllCategoryDto } from './dto/findAll-category.dto';
import { UserEntity } from '../../users/entities/user.entity';
import { SwitchRankCategoryDto } from './dto/switch-rank-category.dto';
import Utils from 'src/common/utils';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create({ store_id, pid, name }: CreateCategoryDto, user: UserEntity) {
    const store = await this.prisma.store.findFirst({
      where: { store_id, user_id: user.user_id },
    });

    if (!store) {
      throw new BadRequestException('商铺不在您名下 或 商铺不存在');
    }

    const category = await this.prisma.category_goods.findFirst({
      where: { store_id, pid: pid ?? '0', name },
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
        rank: lastCategory ? lastCategory.rank + 1 : 0,
        name,
        status: E_CATEGORY_STATUS_TYPE.active,
      },
    });
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

  async findAll({ store_id, pid }: { store_id: string; pid?: string }) {
    return this.prisma.category_goods.findMany({
      where: { store_id, pid: pid ?? '0' },
      orderBy: { rank: 'asc' },
    });
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

  async switchRank(cid: string, { type }: SwitchRankCategoryDto) {
    const category = await this.prisma.category_goods.findUnique({
      where: { category_id: cid },
    });
    if (!category) {
      throw new BadRequestException(
        `未能找到您要修改的分类，请你刷新页面后重试。`,
      );
    }
    console.log('category', category);

    const brothers = await this.prisma.category_goods.findMany({
      where: { store_id: category.store_id, pid: category.pid },
      orderBy: { rank: 'asc' },
    });

    if (!brothers.length) {
      throw new BadRequestException('未能找到同级分类');
    }

    if (brothers.length === 1) {
      throw new BadRequestException('同级分类仅一个元素， 无需修改排序');
    }

    let index;
    brothers.forEach((item, i) => {
      if (item.category_id === cid) {
        index = i;
      }
    });

    if (index === undefined) {
      throw new BadRequestException(`未能在父级中找到 ${category.name} 的位置`);
    }

    if (index === 0 && type === 'up') {
      throw new BadRequestException(
        `分类 ${category.name} 已经是第一位，无需往前调整`,
      );
    }

    if (type === 'up') {
      const preItem = brothers[index - 1];
      return this.prisma.$transaction([
        this.prisma.category_goods.update({
          where: { category_id: cid },
          data: { rank: preItem.rank },
        }),
        this.prisma.category_goods.update({
          where: { category_id: preItem.category_id },
          data: { rank: category.rank },
        }),
      ]);
    }

    if (index === brothers.length - 1 && type === 'down') {
      throw new BadRequestException(
        `分类 ${category.name} 已经是最后一位，无需往后调整`,
      );
    }

    if (type === 'down') {
      const nextItem = brothers[index + 1];
      return this.prisma.$transaction([
        this.prisma.category_goods.update({
          where: { category_id: cid },
          data: { rank: nextItem.rank },
        }),
        this.prisma.category_goods.update({
          where: { category_id: nextItem.category_id },
          data: { rank: category.rank },
        }),
      ]);
    }

    throw new BadRequestException('未知的操作');
  }

  async categoryTree(store_id: string) {
    const categories = await this.prisma.category_goods.findMany({
      where: { store_id, status: E_CATEGORY_STATUS_TYPE.active },
    });
    console.log('categories.length', categories.length);
    return Utils.array2Tree(
      categories,
      { key: 'pid', emptyValue: '0' },
      'category_id',
    );
  }
}
