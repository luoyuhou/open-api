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

    return this.prisma.category_goods.create({
      data: {
        category_id: categoryId,
        store_id,
        pid,
        name,
        status: E_CATEGORY_STATUS_TYPE.active,
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
