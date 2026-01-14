import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Pagination } from '../common/dto/pagination';
import { CreateHomeBannerDto } from './dto/create-home-banner.dto';
import { UpdateHomeBannerDto } from './dto/update-home-banner.dto';

@Injectable()
export class HomeBannerService {
  constructor(private prisma: PrismaService) {}

  public async pagination(pagination: Pagination) {
    const { pageNum, pageSize, sorted, filtered } = pagination;
    const where: Record<string, unknown> = {};

    if (Array.isArray(filtered)) {
      filtered.forEach(({ id, value }) => {
        if (value === undefined || value === null) {
          return;
        }
        if (Array.isArray(value) && !value.length) {
          return;
        }
        if (Array.isArray(value)) {
          where[id] = { in: value };
          return;
        }
        where[id] = value;
      });
    }

    const count = await this.prisma.home_banner.count({ where });

    const orderBy =
      sorted && sorted.length
        ? { [sorted[0].id]: sorted[0].desc ? 'desc' : 'asc' }
        : { sort: 'asc' as const, create_date: 'desc' as const };

    const data = await this.prisma.home_banner.findMany({
      where,
      take: pageSize,
      skip: pageNum * pageSize,
      // orderBy,
    });

    return {
      data,
      rows: count,
      pages: Math.ceil(count / pageSize),
    };
  }

  public async create(dto: CreateHomeBannerDto) {
    const banner_id = `banner-${uuidv4()}`;

    return this.prisma.home_banner.create({
      data: {
        banner_id,
        title: dto.title,
        description: dto.description,
        image_url: dto.image_url,
        width: dto.width,
        height: dto.height,
        sort: dto.sort ?? 0,
        status: dto.status ?? 1,
      },
    });
  }

  public async update(banner_id: string, dto: UpdateHomeBannerDto) {
    const existed = await this.prisma.home_banner.findUnique({
      where: { banner_id },
    });

    if (!existed) {
      throw new NotFoundException('轮播图不存在');
    }

    return this.prisma.home_banner.update({
      where: { banner_id },
      data: dto,
    });
  }

  public async remove(banner_id: string) {
    const existed = await this.prisma.home_banner.findUnique({
      where: { banner_id },
    });

    if (!existed) {
      throw new NotFoundException('轮播图不存在');
    }

    return this.prisma.home_banner.delete({
      where: { banner_id },
    });
  }
}
