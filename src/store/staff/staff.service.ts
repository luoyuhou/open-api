import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';

import { UpdateStaffDto } from './dto/update-staff.dto';
import { v4 as uuidv4 } from 'uuid';
import Utils from '../../common/utils';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async create(createStaffDto: CreateStaffDto) {
    const { store_id, phone } = createStaffDto;
    const normalizedPhone = String(phone || '').trim();

    if (!Utils.isRealMobilePhone(normalizedPhone)) {
      throw new BadRequestException('请输入有效的11位手机号，不能使用临时账号');
    }

    const store = await this.prisma.store.findUnique({
      where: { store_id },
    });
    if (!store) {
      throw new BadRequestException('门店不存在');
    }

    // Check if staff already exists in this store
    const existingStaff = await this.prisma.store_staff.findUnique({
      where: {
        store_id_phone: {
          store_id,
          phone: normalizedPhone,
        },
      },
    });

    if (existingStaff) {
      throw new ConflictException('该手机号已在该店铺注册为员工');
    }

    // 若添加的是店主手机号，自动绑定店主 user_id，便于打卡识别
    let userId = createStaffDto.user_id;
    if (!userId && store.user_id) {
      const owner = await this.prisma.user.findUnique({
        where: { user_id: store.user_id },
      });
      const ownerPhone = String(owner?.phone || '').trim();
      const storePhone = String(store.phone || '').trim();
      if (
        (ownerPhone && ownerPhone === normalizedPhone) ||
        (storePhone && storePhone === normalizedPhone)
      ) {
        userId = store.user_id;
      }
    }

    return this.prisma.store_staff.create({
      data: {
        staff_id: uuidv4(),
        store_id: createStaffDto.store_id,
        name: createStaffDto.name,
        phone: normalizedPhone,
        user_id: userId,
        status: createStaffDto.status ?? 1,
        can_cashier: createStaffDto.can_cashier ?? 0,
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
    const staff = await this.findOne(staffId);

    const data: Record<string, unknown> = {
      update_date: new Date(),
    };
    if (updateStaffDto.name != null) data.name = updateStaffDto.name;
    if (updateStaffDto.phone != null) {
      data.phone = String(updateStaffDto.phone).trim();
    }
    if (updateStaffDto.user_id != null) data.user_id = updateStaffDto.user_id;
    if (updateStaffDto.status != null) data.status = updateStaffDto.status;
    if (updateStaffDto.can_cashier != null) {
      data.can_cashier = updateStaffDto.can_cashier;
    }

    return this.prisma.store_staff.update({
      where: { staff_id: staffId },
      data,
    });
  }

  async remove(staffId: string) {
    await this.findOne(staffId);

    return this.prisma.store_staff.delete({
      where: { staff_id: staffId },
    });
  }
}
