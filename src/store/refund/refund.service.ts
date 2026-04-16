import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { HandleRefundDto } from './dto/handle-refund.dto';
import { UserEntity } from '../../users/entities/user.entity';
import { Pagination } from '../../common/dto/pagination';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefundService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 用户申请退款
   */
  async createRefund(dto: CreateRefundDto, user: UserEntity) {
    // 检查订单
    const order = await this.prisma.user_order.findUnique({
      where: { order_id: dto.orderId },
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.user_id !== user.user_id) {
      throw new Error('无权操作该订单');
    }

    // 检查是否已有退款申请
    const existingRefund = await this.prisma.refund_order.findFirst({
      where: { order_id: dto.orderId, status: 0 },
    });

    if (existingRefund) {
      throw new Error('该订单已有待处理的退款申请');
    }

    // 创建退款申请
    const refund = await this.prisma.refund_order.create({
      data: {
        refund_id: uuidv4(),
        order_id: dto.orderId,
        user_id: user.user_id,
        store_id: order.store_id,
        money: dto.money || order.money,
        reason: dto.reason,
        remark: dto.remark,
        images: dto.images ? JSON.stringify(dto.images) : null,
        status: 0,
      },
    });

    // 更新订单状态（可选：标记为退款中）
    await this.prisma.user_order_action.create({
      data: {
        order_action_id: uuidv4(),
        user_id: user.user_id,
        order_id: dto.orderId,
        status: -1, // 退款中
      },
    });

    return refund;
  }

  /**
   * 获取用户的退款列表
   */
  async getUserRefunds(
    user: UserEntity,
    pagination: Pagination & { status?: number },
  ) {
    const page = pagination.pageNum || 0;
    const size = pagination.pageSize || 10;

    const where: any = { user_id: user.user_id };
    if (pagination.status !== undefined && pagination.status !== null) {
      where.status = pagination.status;
    }

    const [list, total] = await Promise.all([
      this.prisma.refund_order.findMany({
        where,
        skip: page * size,
        take: size,
        orderBy: { create_date: 'desc' },
      }),
      this.prisma.refund_order.count({ where }),
    ]);

    return { list, total, page, size };
  }

  /**
   * 获取店铺的退款列表
   */
  async getStoreRefunds(
    storeId: string,
    pagination: Pagination & { status?: number },
  ) {
    const page = pagination.pageNum || 0;
    const size = pagination.pageSize || 10;

    const where: any = { store_id: storeId };
    if (pagination.status !== undefined && pagination.status !== null) {
      where.status = pagination.status;
    }

    const [list, total] = await Promise.all([
      this.prisma.refund_order.findMany({
        where,
        skip: page * size,
        take: size,
        orderBy: { create_date: 'desc' },
      }),
      this.prisma.refund_order.count({ where }),
    ]);

    // 统计各状态数量
    const statusCounts = await this.prisma.refund_order.groupBy({
      by: ['status'],
      where: { store_id: storeId },
      _count: { refund_id: true },
    });

    const statusStats = {
      pending: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
    };

    statusCounts.forEach((item) => {
      if (item.status === 0) statusStats.pending = item._count.refund_id;
      else if (item.status === 1) statusStats.completed = item._count.refund_id;
      else if (item.status === 2) statusStats.rejected = item._count.refund_id;
      else if (item.status === -1)
        statusStats.cancelled = item._count.refund_id;
    });

    return { list, total, page, size, statusStats };
  }

  /**
   * 获取退款详情
   */
  async getRefundDetail(refundId: string) {
    const refund = await this.prisma.refund_order.findUnique({
      where: { refund_id: refundId },
    });

    if (!refund) {
      throw new Error('退款记录不存在');
    }

    // 获取订单信息
    const order = await this.prisma.user_order.findUnique({
      where: { order_id: refund.order_id },
    });

    // 获取订单商品信息
    const orderItems = await this.prisma.user_order_info.findMany({
      where: { order_id: refund.order_id },
    });

    return { ...refund, order, orderItems };
  }

  /**
   * 商家处理退款
   */
  async handleRefund(refundId: string, dto: HandleRefundDto, user: UserEntity) {
    const refund = await this.prisma.refund_order.findUnique({
      where: { refund_id: refundId },
    });

    if (!refund) {
      throw new Error('退款记录不存在');
    }

    if (refund.status !== 0) {
      throw new Error('该退款申请已处理');
    }

    const updateData: any = {
      handled_at: new Date(),
      handled_by: user.user_id,
    };

    if (dto.action === 'approve') {
      updateData.status = 1; // 已退款
    } else {
      updateData.status = 2; // 已拒绝
      updateData.reject_reason = dto.rejectReason;
    }

    await this.prisma.refund_order.update({
      where: { refund_id: refundId },
      data: updateData,
    });

    // 如果同意退款，更新订单状态
    if (dto.action === 'approve') {
      await this.prisma.user_order.update({
        where: { order_id: refund.order_id },
        data: { status: -2, stage: -2 }, // 已退款状态
      });
    }

    return { success: true };
  }

  /**
   * 用户取消退款
   */
  async cancelRefund(refundId: string, user: UserEntity) {
    const refund = await this.prisma.refund_order.findUnique({
      where: { refund_id: refundId },
    });

    if (!refund) {
      throw new Error('退款记录不存在');
    }

    if (refund.user_id !== user.user_id) {
      throw new Error('无权操作');
    }

    if (refund.status !== 0) {
      throw new Error('该退款申请已处理，无法取消');
    }

    await this.prisma.refund_order.update({
      where: { refund_id: refundId },
      data: { status: -1 },
    });
  }
}
