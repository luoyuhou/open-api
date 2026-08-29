import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CashierOrderDto } from './dto/cashier-order.dto';
import {
  CreatePendingOrderDto,
  PendingOrderPayloadDto,
  UpdatePendingOrderDto,
} from './dto/pending-order.dto';
import { v4 as uuidv4 } from 'uuid';
import customLogger from '../../common/logger';
import { MemberService } from '../member/member.service';
import { StoreService } from '../store.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QRCode = require('qrcode') as typeof import('qrcode');

const PENDING_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class CashierService {
  constructor(
    private prisma: PrismaService,
    private memberService: MemberService,
    private storeService: StoreService,
  ) {}

  // 使用 Promise 链实现简单的互斥锁，防止 SQLite 在非 WAL 模式下的写入冲突
  private lockPromise: Promise<any> = Promise.resolve();

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.lockPromise.then(fn);
    this.lockPromise = next.catch((err) => {
      customLogger.error({ message: 'with lock', error: err.message });
    });
    return next;
  }

  async getSyncData(storeId: string) {
    const categories = await this.prisma.category_goods.findMany({
      where: { store_id: storeId, status: 1 },
      orderBy: { rank: 'asc' },
    });

    const goods = await this.prisma.store_goods.findMany({
      where: { store_id: storeId, status: 1 },
      orderBy: { rank: 'asc' },
    });

    // 由于 prisma schema 中没有定义显示关联，我们通过 goods_id 手动聚合
    const goodsIds = goods.map((g) => g.goods_id);
    const versions = await this.prisma.store_goods_version.findMany({
      where: {
        goods_id: { in: goodsIds },
        status: 1,
      },
    });

    // 组合数据
    const products = goods.map((g) => {
      const gVersions = versions.filter((v) => v.goods_id === g.goods_id);
      return {
        ...g,
        versions: gVersions,
        // 为了兼容小程序本地 db.js 的格式
        price: gVersions[0]?.price || 0,
        billingMode:
          gVersions[0]?.unit_name === 'g' || gVersions[0]?.unit_name === '斤'
            ? 'weight'
            : 'count',
      };
    });

    return {
      categories: categories.map((c) => ({ id: c.category_id, name: c.name })),
      products: products.map((p) => ({
        id: p.goods_id,
        name: p.name,
        categoryIds: (p.category_id || '').split(',').filter(Boolean),
        price: p.price / 100, // 后端分转前端元
        billingMode: p.billingMode,
        status: 'on',
        rank: p.rank ?? 0,
        versions: p.versions.map((v) => ({
          id: v.version_id,
          name: v.version_number || v.unit_name,
          price: v.price / 100,
          barCode: v.bar_code,
        })),
      })),
    };
  }

  async pushOrder(
    dto: CashierOrderDto,
    user?: { user_id: string; phone?: string },
    operatorOverride?: {
      operator_type: string;
      operator_staff_id?: string | null;
      operator_name: string;
    },
  ) {
    return await this.withLock(async () => {
      const results = [];
      const orderDto = dto.order;
      try {
        const operator =
          operatorOverride ||
          (orderDto.operator_type
            ? {
                operator_type: orderDto.operator_type,
                operator_staff_id: orderDto.operator_staff_id || null,
                operator_name: orderDto.operator_name || '',
              }
            : await this.resolveOrderOperator(dto.store_id, user));

        // 开启事务处理单个订单
        const order = await this.prisma.$transaction(async (tx) => {
          // 强制在事务开始时获取写入锁，防止后续升级锁时发生死锁
          await tx.$executeRawUnsafe(
            'UPDATE user SET update_date = update_date WHERE id = -1',
          );

          const orderId = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;

          // 如果是会员，处理余额扣除和积分更新
          if (orderDto.member_id && orderDto.member_id !== 'CASHIER_GUEST') {
            const member = await (tx as any).store_member.findUnique({
              where: { member_id: orderDto.member_id },
            });

            if (member) {
              const payableCents =
                orderDto.payable_amount ?? orderDto.total_amount ?? 0;
              const payMethod = orderDto.payment_method || '';
              const balanceDeduction =
                payMethod === 'balance' || payMethod === 'member_scan'
                  ? payableCents
                  : 0;
              const pointsDeduction = orderDto.points_used || 0;
              const pointsAddition = orderDto.earn_points || 0;

              if (balanceDeduction > 0 && member.balance < balanceDeduction) {
                throw new Error(`会员余额不足`);
              }

              await (tx as any).store_member.update({
                where: { member_id: orderDto.member_id },
                data: {
                  balance: { decrement: balanceDeduction },
                  points: { increment: pointsAddition - pointsDeduction },
                },
              });
            }
          }

          // 计算抵扣金额
          const totalAmount = orderDto.total_amount || 0;
          const payableAmount = orderDto.payable_amount ?? totalAmount;
          const discountAmount = totalAmount - payableAmount;
          const discountRate = orderDto.discount_rate ?? 100;

          const newOrder = await tx.user_order.create({
            data: {
              order_id: orderId,
              store_id: dto.store_id,
              user_id: orderDto.member_id || 'CASHIER_GUEST',
              status: 1, // 已完成
              stage: 3, // 已结算
              payment_method: orderDto.payment_method || 'CASHIER_OFFLINE',
              money: payableAmount,
              original_amount: totalAmount,
              discount_rate: discountRate,
              discount_amount: discountAmount > 0 ? discountAmount : 0,
              points_used: orderDto.points_used || 0,
              points_earn: orderDto.earn_points || 0,
              operator_type: operator.operator_type,
              operator_staff_id: operator.operator_staff_id || null,
              operator_name: operator.operator_name || null,
              recipient: 'CASHIER',
              phone: '',
              province: '',
              city: '',
              area: '',
              town: '',
              address: '线下收银',
              delivery_date: new Date(orderDto.created_at),
              create_date: new Date(orderDto.created_at),
            } as any,
          });

          if (orderDto.items && orderDto.items.length > 0) {
            for (const item of orderDto.items) {
              await tx.user_order_info.create({
                data: {
                  order_info_id: uuidv4(),
                  order_id: orderId,
                  goods_id: item.goods_id,
                  goods_name: item.name,
                  goods_version_id: item.version_id,
                  count: item.count,
                  price: item.price,
                },
              });
            }
          }
          return newOrder;
        });
        results.push({
          local_id: orderDto.local_id,
          remote_id: order.order_id,
          status: 'success',
        });
      } catch (error) {
        results.push({
          local_id: orderDto.local_id,
          status: 'error',
          message: error.message,
        });
      }

      return results;
    });
  }

  /** 根据当前登录用户解析订单操作人 */
  private async resolveOrderOperator(
    storeId: string,
    user?: { user_id: string; phone?: string },
  ) {
    if (!user?.user_id) {
      return {
        operator_type: 'staff',
        operator_staff_id: null,
        operator_name: '店员',
      };
    }

    const store = await this.prisma.store.findUnique({
      where: { store_id: storeId },
      select: { user_id: true },
    });

    const staff = await (this.prisma as any).store_staff.findFirst({
      where: {
        store_id: storeId,
        status: 1,
        OR: [
          { user_id: user.user_id },
          ...(user.phone ? [{ phone: String(user.phone).trim() }] : []),
        ],
      },
    });

    if (store?.user_id === user.user_id) {
      return {
        operator_type: 'owner',
        operator_staff_id: staff?.staff_id || null,
        operator_name: '店主',
      };
    }

    if (staff) {
      return {
        operator_type: 'staff',
        operator_staff_id: staff.staff_id,
        operator_name: staff.name || '店员',
      };
    }

    return {
      operator_type: 'staff',
      operator_staff_id: null,
      operator_name: user.phone ? String(user.phone) : '店员',
    };
  }

  async getTodayOrderCount(storeId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.user_order.count({
      where: {
        store_id: storeId,
        create_date: {
          gte: today,
        },
        status: 1, // 已完成
      },
    });
  }

  /** 今日各商品销量（已完成订单明细聚合，不分页） */
  async getTodaySalesByGoods(storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<
      { goods_id: string; quantity: number | bigint }[]
    >`
      SELECT oi.goods_id, SUM(oi.count) AS quantity
      FROM user_order_info oi
      INNER JOIN user_order o ON o.order_id = oi.order_id
      WHERE o.store_id = ${storeId}
        AND o.status = 1
        AND o.create_date >= ${today}
      GROUP BY oi.goods_id
    `;

    const sales: Record<string, number> = {};
    for (const row of rows) {
      sales[row.goods_id] = Number(row.quantity);
    }

    return { sales };
  }

  async getTodayOrders(storeId: string, page = 1, pageSize = 5) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.getOrders(storeId, page, pageSize, { fromDate: today });
  }

  /** 分页查询已完成订单，支持手机号模糊检索 */
  async getOrders(
    storeId: string,
    page = 1,
    pageSize = 10,
    options: { phone?: string; fromDate?: Date } = {},
  ) {
    const skip = (page - 1) * pageSize;
    const where: {
      store_id: string;
      status?: number | { in: number[] };
      create_date?: { gte: Date };
      user_id?: { in: string[] };
    } = {
      store_id: storeId,
      // 1 已完成（可含部分退款），2 已全额退款
      status: { in: [1, 2] },
    };

    if (options.fromDate) {
      where.create_date = { gte: options.fromDate };
      // 今日成交/营收不计入已全额退款
      where.status = 1;
    }

    const phone = options.phone?.trim();
    if (phone) {
      const members = await (this.prisma as any).store_member.findMany({
        where: {
          store_id: storeId,
          phone: { contains: phone },
        },
        select: { member_id: true },
      });
      const memberIds = members.map((m: { member_id: string }) => m.member_id);
      if (memberIds.length === 0) {
        return [];
      }
      where.user_id = { in: memberIds };
    }

    const orders = await this.prisma.user_order.findMany({
      where,
      orderBy: { create_date: 'desc' },
      skip,
      take: pageSize,
    });

    return this.formatCashierOrders(orders);
  }

  private async formatCashierOrders(
    orders: Awaited<ReturnType<PrismaService['user_order']['findMany']>>,
  ) {
    if (orders.length === 0) {
      return [];
    }

    const orderIds = orders.map((o) => o.order_id);
    const orderInfos = await this.prisma.user_order_info.findMany({
      where: { order_id: { in: orderIds } },
    });

    const memberIds = orders
      .map((o) => o.user_id)
      .filter((id) => id && id !== 'CASHIER_GUEST');
    const members =
      memberIds.length > 0
        ? await (this.prisma as any).store_member.findMany({
            where: { member_id: { in: memberIds } },
          })
        : [];

    const versionIds = orderInfos.map((i) => i.goods_version_id);
    const versions =
      versionIds.length > 0
        ? await this.prisma.store_goods_version.findMany({
            where: { version_id: { in: versionIds } },
          })
        : [];

    return orders.map((o) => {
      const items = orderInfos
        .filter((info) => info.order_id === o.order_id)
        .map((item) => {
          const v = versions.find(
            (v) => v.version_id === item.goods_version_id,
          );
          const billingMode =
            v?.unit_name === 'g' || v?.unit_name === '斤' ? 'weight' : 'count';
          return {
            id: item.goods_id,
            versionId: item.goods_version_id,
            name: item.goods_name,
            quantity: item.count,
            price: (item.price / 100).toFixed(2),
            billingMode,
          };
        });

      const member = members.find(
        (m: { member_id: string }) => m.member_id === o.user_id,
      );
      const originalAmount = (o.original_amount || o.money) / 100;
      const totalDiscountAmount = (o.discount_amount || 0) / 100;
      const payableAmount = o.money / 100;
      const discountRate = o.discount_rate ?? 100;
      const manualDiscountAmount =
        discountRate < 100 ? (originalAmount * (100 - discountRate)) / 100 : 0;
      const pointsDiscountAmount = Math.max(
        0,
        totalDiscountAmount - manualDiscountAmount,
      );

      const refundedAmount = ((o as any).refunded_amount || 0) / 100;
      const refundableAmount = Math.max(0, payableAmount - refundedAmount);
      const clearPointsDone = ((o as any).refund_clear_points || 0) === 1;
      let refundStatus: 'none' | 'partial' | 'full' = 'none';
      if (o.status === 2 || refundableAmount <= 0) {
        refundStatus = 'full';
      } else if (refundedAmount > 0) {
        refundStatus = 'partial';
      }

      return {
        id: o.order_id,
        memberId: o.user_id,
        memberName: member ? member.name : '散客',
        memberPhone: member ? member.phone : '',
        totalAmount: originalAmount.toFixed(2),
        payableAmount: payableAmount.toFixed(2),
        refundedAmount: refundedAmount.toFixed(2),
        refundableAmount: refundableAmount.toFixed(2),
        refundStatus,
        clearPointsDone,
        canRefund: refundableAmount > 0 && o.status !== 2,
        discountAmount: totalDiscountAmount.toFixed(2),
        manualDiscountAmount: manualDiscountAmount.toFixed(2),
        pointsDiscountAmount: pointsDiscountAmount.toFixed(2),
        discountRate:
          discountRate < 100 ? (discountRate / 10).toFixed(1) : null,
        pointsUsed: o.points_used || 0,
        earnPoints: o.points_earn || 0,
        createdAt: o.create_date,
        status:
          refundStatus === 'full'
            ? 'refunded'
            : refundStatus === 'partial'
            ? 'partial_refunded'
            : 'completed',
        paymentMethod: o.payment_method,
        operatorType: (o as any).operator_type || '',
        operatorName: (o as any).operator_name || '',
        operatorStaffId: (o as any).operator_staff_id || '',
        items,
      };
    });
  }

  /**
   * 店主订单退款（支持部分退款）：
   * - 会员单：退回账户余额；积分清理可选
   * - 散客单：仅登记退款（不涉及余额/积分）
   * amount 单位为元。
   */
  async refundOrder(
    orderId: string,
    user: { user_id: string },
    { amount, clear_points }: { amount: number; clear_points?: boolean },
  ) {
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new BadRequestException('退款金额无效');
    }

    return this.withLock(async () => {
      const order = await this.prisma.user_order.findUnique({
        where: { order_id: orderId },
      });
      if (!order) {
        throw new BadRequestException('订单不存在');
      }
      if (order.status !== 1 && order.status !== 2) {
        throw new BadRequestException('订单状态不可退款');
      }

      const store = await this.prisma.store.findUnique({
        where: { store_id: order.store_id },
      });
      if (!store || store.user_id !== user.user_id) {
        throw new BadRequestException('仅门店所有者可操作退款');
      }

      const alreadyRefunded = (order as any).refunded_amount || 0;
      const refundable = order.money - alreadyRefunded;
      if (refundable <= 0 || order.status === 2) {
        throw new BadRequestException('订单已全额退款');
      }
      if (amountCents > refundable) {
        throw new BadRequestException(
          `退款金额不能超过可退金额 ¥${(refundable / 100).toFixed(2)}`,
        );
      }

      const isGuest = !order.user_id || order.user_id === 'CASHIER_GUEST';
      let member: {
        member_id: string;
        store_id: string;
        points: number;
      } | null = null;

      if (!isGuest) {
        member = await (this.prisma as any).store_member.findUnique({
          where: { member_id: order.user_id },
        });
        if (!member || member.store_id !== order.store_id) {
          throw new BadRequestException('会员不存在，无法退回余额');
        }
      }

      const shouldClearPoints =
        !isGuest &&
        !!clear_points &&
        ((order as any).refund_clear_points || 0) !== 1;
      const pointsUsed = order.points_used || 0;
      const pointsEarn = order.points_earn || 0;

      const newRefunded = alreadyRefunded + amountCents;
      const fullyRefunded = newRefunded >= order.money;

      await this.prisma.$transaction(async (tx) => {
        if (!isGuest && member) {
          await (tx as any).store_member.update({
            where: { member_id: order.user_id },
            data: {
              balance: { increment: amountCents },
              ...(shouldClearPoints
                ? {
                    points: {
                      set: Math.max(
                        0,
                        (member.points || 0) + pointsUsed - pointsEarn,
                      ),
                    },
                  }
                : {}),
            },
          });

          // 写入账户流水，供会员交易明细展示（含部分退款）
          const refundYuan = (amountCents / 100).toFixed(2);
          const remarkParts = [
            fullyRefunded ? '订单退款' : '订单部分退款',
            `¥${refundYuan}`,
            `单号${orderId}`,
          ];
          if (shouldClearPoints) {
            remarkParts.push('已清积分');
          }
          await (tx as any).store_recharge.create({
            data: {
              recharge_id: `order-refund-${uuidv4().substring(0, 8)}`,
              member_id: order.user_id,
              store_id: order.store_id,
              amount: amountCents,
              received_amount: amountCents,
              cashier_name: '店主退款',
              remark: remarkParts.join(' '),
            },
          });
        }

        await tx.user_order.update({
          where: { order_id: orderId },
          data: {
            refunded_amount: newRefunded,
            ...(shouldClearPoints ? { refund_clear_points: 1 } : {}),
            ...(fullyRefunded ? { status: 2 } : {}),
            update_date: new Date(),
          } as any,
        });

        await (tx as any).store_order_refund.create({
          data: {
            refund_id: `refund-log-${uuidv4().substring(0, 8)}`,
            store_id: order.store_id,
            order_id: orderId,
            amount: amountCents,
            payment_method: order.payment_method || null,
          },
        });
      });

      return {
        orderId,
        refundAmount: amountCents / 100,
        refundedAmount: newRefunded / 100,
        refundableAmount: Math.max(0, order.money - newRefunded) / 100,
        clearPoints: shouldClearPoints,
        toBalance: !isGuest,
        status: fullyRefunded ? 'refunded' : 'partial_refunded',
      };
    });
  }

  private getMemberScanDiscountRate(settings: {
    memberDiscountRate?: number;
  }): number {
    const memberRate = settings.memberDiscountRate ?? 10;
    if (memberRate >= 10) return 100;
    return Math.round(memberRate * 10);
  }

  private isPointsRedemptionDay(settings: {
    redemptionDays?: number[];
    redemptionEnabled?: boolean;
  }): boolean {
    if (settings.redemptionEnabled === false) return false;
    const today = new Date().getDate();
    const redemptionDays = (settings.redemptionDays || [])
      .map((d) => Number(d))
      .filter((d) => !Number.isNaN(d) && d >= 1 && d <= 31);
    return redemptionDays.length === 0 || redemptionDays.includes(today);
  }

  private calcMemberPayAmounts(
    payload: PendingOrderPayloadDto,
    member: { points: number },
    settings: {
      redemptionDays?: number[];
      pointsRedemptionRatio?: number;
      pointsPerYuan?: number;
      memberDiscountRate?: number;
      redemptionEnabled?: boolean;
    },
  ) {
    const totalAmount = payload.total_amount || 0;
    const discountRate = this.getMemberScanDiscountRate(settings);
    const discountedTotalCents = Math.round((totalAmount * discountRate) / 100);

    const isRedemptionDay = this.isPointsRedemptionDay(settings);
    const availablePoints = Number(member.points) || 0;

    let pointsUsed = 0;
    let pointsDiscountCents = 0;

    if (isRedemptionDay && availablePoints > 0) {
      const ratio = Number(settings.pointsRedemptionRatio) || 100;
      // 与结账页一致：支持不足 1 元的积分抵扣（如 50 积分抵 0.5 元）
      const maxDiscountByPointsCents = Math.round(
        (availablePoints / ratio) * 100,
      );
      pointsDiscountCents = Math.min(
        discountedTotalCents,
        maxDiscountByPointsCents,
      );
      pointsUsed = Math.round((pointsDiscountCents / 100) * ratio);
      // 防止四舍五入后超过可用积分
      if (pointsUsed > availablePoints) {
        pointsUsed = availablePoints;
        pointsDiscountCents = Math.round((pointsUsed / ratio) * 100);
        pointsDiscountCents = Math.min(
          pointsDiscountCents,
          discountedTotalCents,
        );
      }
    }

    const payableCents = discountedTotalCents - pointsDiscountCents;
    const pointsPerYuan = settings.pointsPerYuan || 1;
    const earnPoints = Math.floor((payableCents / 100) * pointsPerYuan);

    return {
      discountedTotalCents,
      pointsUsed,
      pointsDiscountCents,
      payableCents,
      earnPoints,
      isRedemptionDay,
      discountRate,
    };
  }

  private async buildQrPayload(pendingId: string) {
    const qrText = `jyb:${pendingId}`;
    const qrDataUrl = await QRCode.toDataURL(qrText, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    return { qrText, qrDataUrl };
  }

  private async getPendingRow(pendingId: string, storeId?: string) {
    const row = await this.prisma.store_pay_pending.findUnique({
      where: { pending_id: pendingId },
    });
    if (!row) {
      throw new BadRequestException('待支付订单不存在');
    }
    if (storeId && row.store_id !== storeId) {
      throw new BadRequestException('待支付订单不存在');
    }
    if (row.status === 'pending' && row.expire_at < new Date()) {
      await this.prisma.store_pay_pending.update({
        where: { pending_id: pendingId },
        data: { status: 'expired', update_date: new Date() },
      });
      row.status = 'expired';
    }
    return row;
  }

  async createOrUpdatePendingOrder(dto: CreatePendingOrderDto) {
    const expireAt = new Date(Date.now() + PENDING_TTL_MS);
    const payload = JSON.stringify(dto.order);
    let pendingId = dto.pending_id;

    if (pendingId) {
      const existing = await this.getPendingRow(pendingId, dto.store_id);
      if (existing.status !== 'pending') {
        throw new BadRequestException('待支付订单已失效');
      }
      await this.prisma.store_pay_pending.update({
        where: { pending_id: pendingId },
        data: {
          payload,
          expire_at: expireAt,
          update_date: new Date(),
        },
      });
    } else {
      pendingId = uuidv4();
      await this.prisma.store_pay_pending.create({
        data: {
          pending_id: pendingId,
          store_id: dto.store_id,
          status: 'pending',
          payload,
          expire_at: expireAt,
        },
      });
    }

    const { qrText, qrDataUrl } = await this.buildQrPayload(pendingId);
    return {
      pendingId,
      qrText,
      qrDataUrl,
      status: 'pending',
      expireAt,
    };
  }

  async updatePendingOrder(pendingId: string, dto: UpdatePendingOrderDto) {
    return this.createOrUpdatePendingOrder({
      store_id: dto.store_id,
      order: dto.order,
      pending_id: pendingId,
    });
  }

  async getPendingOrderStatus(pendingId: string, storeId: string) {
    const row = await this.getPendingRow(pendingId, storeId);
    return {
      status: row.status,
      orderId: row.order_id || null,
      memberId: row.member_id || null,
    };
  }

  private async calcByPendingIdAndPhone(pendingId: string, phone: string) {
    const row = await this.getPendingRow(pendingId);
    if (row.status !== 'pending') {
      throw new BadRequestException('订单已失效或已支付');
    }

    const member = await this.memberService.findByPhone(row.store_id, phone);
    if (!member) {
      throw new BadRequestException('您不是本店会员，请联系店员');
    }

    const settings = await this.storeService.getSettings(row.store_id);
    const payload = JSON.parse(row.payload) as PendingOrderPayloadDto;
    const calc = this.calcMemberPayAmounts(payload, member, settings);

    return { row, payload, calc, settings, member };
  }

  async getMemberPayPreview(pendingId: string, phone: string) {
    const { row, payload, calc, settings, member } =
      await this.calcByPendingIdAndPhone(pendingId, phone);
    const store = await this.prisma.store.findUnique({
      where: { store_id: row.store_id },
      select: { store_name: true },
    });

    const discountRate = calc.discountRate;

    return {
      storeId: row.store_id,
      storeName: store?.store_name || '',
      pendingId,
      items: payload.items.map((item) => ({
        name: item.name,
        count: item.count,
        price: item.price / 100,
      })),
      totalAmount: payload.total_amount / 100,
      discountRate: discountRate < 100 ? discountRate / 10 : null,
      manualDiscountAmount:
        (payload.total_amount - calc.discountedTotalCents) / 100,
      discountedTotal: calc.discountedTotalCents / 100,
      pointsUsed: calc.pointsUsed,
      pointsDiscountAmount: calc.pointsDiscountCents / 100,
      pointsRedemptionRatio: Number(settings.pointsRedemptionRatio) || 100,
      payableAmount: calc.payableCents / 100,
      earnPoints: calc.earnPoints,
      memberBalance: member.balance / 100,
      memberPoints: member.points,
      memberName: member.name,
      isRedemptionDay: calc.isRedemptionDay,
      balanceEnough: member.balance >= calc.payableCents,
    };
  }

  async memberPay(pendingId: string, phone: string) {
    const { row, member, payload, calc } = await this.calcByPendingIdAndPhone(
      pendingId,
      phone,
    );

    if (member.balance < calc.payableCents) {
      throw new BadRequestException('支付失败，请联系店员充值');
    }

    const orderDto = {
      local_id: payload.local_id,
      member_id: member.member_id,
      total_amount: payload.total_amount,
      payable_amount: calc.payableCents,
      discount_rate: calc.discountRate,
      payment_method: 'member_scan',
      points_used: calc.pointsUsed,
      earn_points: calc.earnPoints,
      created_at: payload.created_at,
      items: payload.items,
    };

    const [result] = await this.pushOrder(
      {
        store_id: row.store_id,
        order: orderDto,
      },
      undefined,
      {
        operator_type: 'customer',
        operator_staff_id: null,
        operator_name: '顾客',
      },
    );

    if (result.status !== 'success') {
      throw new BadRequestException(
        result.message || '支付失败，请联系店员充值',
      );
    }

    await this.prisma.store_pay_pending.update({
      where: { pending_id: pendingId },
      data: {
        status: 'paid',
        order_id: result.remote_id,
        member_id: member.member_id,
        update_date: new Date(),
      },
    });

    return {
      orderId: result.remote_id,
      payableAmount: calc.payableCents / 100,
      pointsUsed: calc.pointsUsed,
      earnPoints: calc.earnPoints,
    };
  }
}
