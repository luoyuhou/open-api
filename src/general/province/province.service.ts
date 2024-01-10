import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProvinceService {
  constructor(private prisma: PrismaService) {}
  async findAll(pid?: string) {
    if (!pid || pid.length > 6) {
      return this.prisma.province.findMany({ where: { city: '0' } });
    }

    const [province, city, area] = pid.match(/(.{2})/g);
    if (area !== '00') {
      return this.prisma.province.findMany({
        where: { province, city, area, NOT: { town: '0' } },
      });
    }

    if (city !== '00') {
      return this.prisma.province.findMany({
        where: { province, city, town: '0', NOT: { area: '0' } },
      });
    }

    if (['11', '12', '50', '81', '82'].includes(province)) {
      return this.prisma.province.findMany({
        where: { province, town: '0', NOT: { area: '0' } },
      });
    }

    return this.prisma.province.findMany({
      where: { province, town: '0', area: '0', NOT: { city: '0' } },
    });
  }

  async findOne(code: string) {
    return this.prisma.province.findFirst({ where: { code } });
  }
}
