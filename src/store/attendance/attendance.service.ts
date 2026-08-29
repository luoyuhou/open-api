import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserEntity } from '../../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { PunchDto } from './dto/punch.dto';
import { AdjustAttendanceDto } from './dto/adjust-attendance.dto';

function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateTime(input: string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('时间格式无效');
  }
  return d;
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  private async assertOwner(storeId: string, user: UserEntity) {
    const store = await this.prisma.store.findUnique({
      where: { store_id: storeId },
    });
    if (!store || store.user_id !== user.user_id) {
      throw new ForbiddenException('仅门店所有者可操作');
    }
    return store;
  }

  /** 仅员工列表中的启用员工可打卡（含已加入员工列表的店主） */
  private async resolveStaff(storeId: string, user: UserEntity) {
    const staff = await (this.prisma as any).store_staff.findFirst({
      where: {
        store_id: storeId,
        status: 1,
        OR: [
          ...(user.user_id ? [{ user_id: user.user_id }] : []),
          ...(user.phone ? [{ phone: user.phone }] : []),
        ],
      },
    });

    if (staff) {
      if (!staff.user_id && user.user_id) {
        await (this.prisma as any).store_staff.update({
          where: { staff_id: staff.staff_id },
          data: { user_id: user.user_id, update_date: new Date() },
        });
        staff.user_id = user.user_id;
      }
      return staff;
    }

    const store = await this.prisma.store.findUnique({
      where: { store_id: storeId },
    });
    if (store && store.user_id === user.user_id) {
      throw new ForbiddenException(
        '请先在「员工考勤」中将自己添加为员工后再打卡',
      );
    }

    throw new ForbiddenException('您不是该门店员工，无法打卡');
  }

  async getMineToday(storeId: string, user: UserEntity) {
    const staff = await this.resolveStaff(storeId, user);
    const workDate = todayStr();
    const record = await (this.prisma as any).store_attendance.findUnique({
      where: {
        store_id_staff_id_work_date: {
          store_id: storeId,
          staff_id: staff.staff_id,
          work_date: workDate,
        },
      },
    });

    const store = await this.prisma.store.findUnique({
      where: { store_id: storeId },
    });
    const isOwner = !!(store && store.user_id === user.user_id);

    return {
      staff: {
        staff_id: staff.staff_id,
        name: isOwner ? `${staff.name}（店主）` : staff.name,
        phone: staff.phone,
        can_cashier: staff.can_cashier,
        is_owner: isOwner,
      },
      work_date: workDate,
      check_in_at: record?.check_in_at || null,
      check_out_at: record?.check_out_at || null,
      check_in_type: record?.check_in_type || null,
      check_out_type: record?.check_out_type || null,
    };
  }

  async punch(user: UserEntity, dto: PunchDto) {
    const staff = await this.resolveStaff(dto.store_id, user);
    const workDate = todayStr();
    const now = new Date();
    const existing = await (this.prisma as any).store_attendance.findUnique({
      where: {
        store_id_staff_id_work_date: {
          store_id: dto.store_id,
          staff_id: staff.staff_id,
          work_date: workDate,
        },
      },
    });

    if (dto.type === 'in') {
      if (existing?.check_in_at) {
        throw new BadRequestException('今日已上班打卡');
      }
      if (existing) {
        return (this.prisma as any).store_attendance.update({
          where: { attendance_id: existing.attendance_id },
          data: {
            check_in_at: now,
            check_in_type: 'self',
            check_in_by: user.user_id,
            update_date: now,
          },
        });
      }
      return (this.prisma as any).store_attendance.create({
        data: {
          attendance_id: `att-${uuidv4().substring(0, 12)}`,
          store_id: dto.store_id,
          staff_id: staff.staff_id,
          work_date: workDate,
          check_in_at: now,
          check_in_type: 'self',
          check_in_by: user.user_id,
        },
      });
    }

    if (!existing?.check_in_at) {
      throw new BadRequestException('请先上班打卡');
    }
    if (existing.check_out_at) {
      throw new BadRequestException('今日已下班打卡');
    }
    return (this.prisma as any).store_attendance.update({
      where: { attendance_id: existing.attendance_id },
      data: {
        check_out_at: now,
        check_out_type: 'self',
        check_out_by: user.user_id,
        update_date: now,
      },
    });
  }

  async list(
    storeId: string,
    user: UserEntity,
    options: { date?: string; staffId?: string } = {},
  ) {
    const store = await this.assertOwner(storeId, user);
    const workDate = options.date || todayStr();
    const where: any = {
      store_id: storeId,
      work_date: workDate,
    };
    if (options.staffId) {
      where.staff_id = options.staffId;
    }
    const records = await (this.prisma as any).store_attendance.findMany({
      where,
      orderBy: { check_in_at: 'asc' },
    });
    const staffList = await (this.prisma as any).store_staff.findMany({
      where: {
        store_id: storeId,
        ...(options.staffId ? { staff_id: options.staffId } : {}),
      },
      orderBy: { create_date: 'desc' },
    });

    const ownerUser = store.user_id
      ? await this.prisma.user.findUnique({ where: { user_id: store.user_id } })
      : null;
    const ownerPhone = String(ownerUser?.phone || store.phone || '').trim();

    const recordByStaff = new Map(records.map((r: any) => [r.staff_id, r]));
    const items = staffList.map((staff: any) => {
      const r = recordByStaff.get(staff.staff_id) as any;
      const isOwner =
        staff.user_id === store.user_id ||
        (!!ownerPhone && staff.phone === ownerPhone);
      return {
        attendance_id: r?.attendance_id || `empty-${staff.staff_id}`,
        store_id: storeId,
        staff_id: staff.staff_id,
        work_date: workDate,
        check_in_at: r?.check_in_at || null,
        check_out_at: r?.check_out_at || null,
        check_in_type: r?.check_in_type || null,
        check_out_type: r?.check_out_type || null,
        remark: r?.remark || null,
        staff_name: isOwner ? `${staff.name || ''}（店主）` : staff.name || '',
        staff_phone: staff.phone || '',
        can_cashier: staff.can_cashier,
        status: staff.status,
        is_owner: isOwner,
      };
    });

    return {
      work_date: workDate,
      items,
      staff_options: staffList.map((s: any) => {
        const isOwner =
          s.user_id === store.user_id ||
          (!!ownerPhone && s.phone === ownerPhone);
        return {
          id: s.staff_id,
          name: isOwner ? `${s.name}（店主）` : s.name,
          phone: s.phone,
        };
      }),
    };
  }

  async adjust(user: UserEntity, dto: AdjustAttendanceDto) {
    await this.assertOwner(dto.store_id, user);

    if (String(dto.staff_id || '').startsWith('owner-')) {
      throw new BadRequestException(
        '请先将店主添加为员工后再补卡（旧虚拟记录已停用）',
      );
    }

    const staff = await (this.prisma as any).store_staff.findUnique({
      where: { staff_id: dto.staff_id },
    });
    if (!staff || staff.store_id !== dto.store_id) {
      throw new NotFoundException('员工不存在');
    }

    if (!dto.check_in_at && !dto.check_out_at) {
      throw new BadRequestException('请至少填写上班或下班时间');
    }

    const checkInAt = dto.check_in_at
      ? parseDateTime(dto.check_in_at)
      : undefined;
    const checkOutAt = dto.check_out_at
      ? parseDateTime(dto.check_out_at)
      : undefined;
    if (checkInAt && checkOutAt && checkOutAt < checkInAt) {
      throw new BadRequestException('下班时间不能早于上班时间');
    }

    const existing = await (this.prisma as any).store_attendance.findUnique({
      where: {
        store_id_staff_id_work_date: {
          store_id: dto.store_id,
          staff_id: dto.staff_id,
          work_date: dto.work_date,
        },
      },
    });

    const now = new Date();
    const data: any = {
      update_date: now,
      remark: dto.remark != null ? dto.remark : existing?.remark,
    };
    if (checkInAt) {
      data.check_in_at = checkInAt;
      data.check_in_type = 'owner';
      data.check_in_by = user.user_id;
    }
    if (checkOutAt) {
      data.check_out_at = checkOutAt;
      data.check_out_type = 'owner';
      data.check_out_by = user.user_id;
    }

    if (existing) {
      return (this.prisma as any).store_attendance.update({
        where: { attendance_id: existing.attendance_id },
        data,
      });
    }

    if (!checkInAt) {
      throw new BadRequestException('新建记录时请填写上班时间');
    }

    return (this.prisma as any).store_attendance.create({
      data: {
        attendance_id: `att-${uuidv4().substring(0, 12)}`,
        store_id: dto.store_id,
        staff_id: dto.staff_id,
        work_date: dto.work_date,
        check_in_at: checkInAt,
        check_out_at: checkOutAt || null,
        check_in_type: 'owner',
        check_out_type: checkOutAt ? 'owner' : null,
        check_in_by: user.user_id,
        check_out_by: checkOutAt ? user.user_id : null,
        remark: dto.remark || null,
      },
    });
  }
}
