import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';

import { UpdateStaffDto } from './dto/update-staff.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async create(createStaffDto: CreateStaffDto) {
    const { store_id, phone } = createStaffDto;

    // Check if staff already exists in this store
    const existingStaff = await this.prisma.store_staff.findUnique({
      where: {
        store_id_phone: {
          store_id,
          phone,
        },
      },
    });

    if (existingStaff) {
      throw new ConflictException('该手机号已在该店铺注册为员工');
    }

    return this.prisma.store_staff.create({
      data: {
        staff_id: uuidv4(),
        ...createStaffDto,
      },
    });
  }

  async findAll(storeId: string) {
    return this.prisma.store_staff.findMany({
      where: {
        store_id: storeId,
      },
      orderBy: {
        create_date: 'desc',
      },
    });
  }

  async findOne(staffId: string) {
    const staff = await this.prisma.store_staff.findUnique({
      where: { staff_id: staffId },
    });

    if (!staff) {
      throw new NotFoundException(`未找到ID为 ${staffId} 的员工`);
    }

    return staff;
  }

  async update(staffId: string, updateStaffDto: UpdateStaffDto) {
    await this.findOne(staffId);

    return this.prisma.store_staff.update({
      where: { staff_id: staffId },
      data: {
        ...updateStaffDto,
        update_date: new Date(),
      },
    });
  }

  async remove(staffId: string) {
    await this.findOne(staffId);

    return this.prisma.store_staff.delete({
      where: { staff_id: staffId },
    });
  }
}
