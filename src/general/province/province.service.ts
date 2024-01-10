import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProvinceService {
  constructor(private prisma: PrismaService) {}
  findAll(pid?: string) {
    if (!pid || pid.length > 6) {
      return this.prisma.province.findMany({ where: { city: '0' } });
    }

    const [province, city, area] = pid.match(/(.{2})/g);
    if (area !== '00') {
      return this.prisma.province.findMany({ where: { province, city, area } });
    }

    if (city !== '00') {
      return this.prisma.province.findMany({ where: { province, city } });
    }

    return this.prisma.province.findMany({ where: { province } });
  }

  findOne(code: number) {
    return this.prisma.province.findFirst({ where: { code } });
  }
}
