import { Test, TestingModule } from '@nestjs/testing';
import { RefundService } from './refund.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RefundService', () => {
  let service: RefundService;
  let prisma: any;

  const defaultPagination = {
    pageNum: 0,
    pageSize: 10,
    sorted: [],
    filtered: [],
  };

  beforeEach(async () => {
    const mockPrisma = {
      user_order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user_order_info: {
        findMany: jest.fn(),
      },
      user_order_action: {
        create: jest.fn(),
      },
      refund_order: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRefund', () => {
    it('should create refund successfully', async () => {
      const dto = { orderId: 'order1', money: 100, reason: 'reason' };
      const user = { user_id: 'user1' } as any;
      const mockOrder = {
        order_id: 'order1',
        user_id: 'user1',
        store_id: 'store1',
        money: 100,
      };
      const mockRefund = { refund_id: 'r1', ...dto };

      prisma.user_order.findUnique.mockResolvedValue(mockOrder);
      prisma.refund_order.findFirst.mockResolvedValue(null);
      prisma.refund_order.create.mockResolvedValue(mockRefund);
      prisma.user_order_action.create.mockResolvedValue({});

      const result = await service.createRefund(dto, user);

      expect(result.refund_id).toBe('r1');
    });

    it('should throw error if order not found', async () => {
      const dto = { orderId: 'order1', money: 100, reason: 'reason' };
      const user = { user_id: 'user1' } as any;

      prisma.user_order.findUnique.mockResolvedValue(null);

      await expect(service.createRefund(dto, user)).rejects.toThrow(
        '订单不存在',
      );
    });

    it('should throw error if user not owner', async () => {
      const dto = { orderId: 'order1', money: 100, reason: 'reason' };
      const user = { user_id: 'user1' } as any;
      const mockOrder = {
        order_id: 'order1',
        user_id: 'user2',
        store_id: 'store1',
      };

      prisma.user_order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.createRefund(dto, user)).rejects.toThrow(
        '无权操作该订单',
      );
    });

    it('should throw error if pending refund exists', async () => {
      const dto = { orderId: 'order1', money: 100, reason: 'reason' };
      const user = { user_id: 'user1' } as any;
      const mockOrder = {
        order_id: 'order1',
        user_id: 'user1',
        store_id: 'store1',
      };
      const existingRefund = { refund_id: 'r1' };

      prisma.user_order.findUnique.mockResolvedValue(mockOrder);
      prisma.refund_order.findFirst.mockResolvedValue(existingRefund);

      await expect(service.createRefund(dto, user)).rejects.toThrow(
        '该订单已有待处理的退款申请',
      );
    });
  });

  describe('getUserRefunds', () => {
    it('should return paginated user refunds', async () => {
      const mockRefunds = [{ refund_id: 'r1' }];
      prisma.refund_order.findMany.mockResolvedValue(mockRefunds);
      prisma.refund_order.count.mockResolvedValue(1);

      const result = await service.getUserRefunds(
        { user_id: 'user1' } as any,
        defaultPagination,
      );

      expect(result.list).toHaveLength(1);
    });
  });

  describe('getStoreRefunds', () => {
    it('should return paginated store refunds with status stats', async () => {
      const mockRefunds = [{ refund_id: 'r1' }];
      const mockStatusCounts = [
        { status: 0, _count: { refund_id: 5 } },
        { status: 1, _count: { refund_id: 10 } },
      ];

      prisma.refund_order.findMany.mockResolvedValue(mockRefunds);
      prisma.refund_order.count.mockResolvedValue(15);
      prisma.refund_order.groupBy.mockResolvedValue(mockStatusCounts);

      const result = await service.getStoreRefunds('store1', defaultPagination);

      expect(result.list).toHaveLength(1);
      expect(result.statusStats.pending).toBe(5);
      expect(result.statusStats.completed).toBe(10);
    });
  });

  describe('getRefundDetail', () => {
    it('should return refund detail with order and items', async () => {
      const mockRefund = { refund_id: 'r1', order_id: 'order1' };
      const mockOrder = { order_id: 'order1' };
      const mockItems = [{ order_info_id: 'i1' }];

      prisma.refund_order.findUnique.mockResolvedValue(mockRefund);
      prisma.user_order.findUnique.mockResolvedValue(mockOrder);
      prisma.user_order_info.findMany.mockResolvedValue(mockItems);

      const result = await service.getRefundDetail('r1');

      expect(result.refund_id).toBe('r1');
      expect(result.order).toBeDefined();
      expect(result.orderItems).toHaveLength(1);
    });

    it('should throw error if refund not found', async () => {
      prisma.refund_order.findUnique.mockResolvedValue(null);

      await expect(service.getRefundDetail('r1')).rejects.toThrow(
        '退款记录不存在',
      );
    });
  });

  describe('handleRefund', () => {
    it('should approve refund', async () => {
      const mockRefund = { refund_id: 'r1', order_id: 'order1', status: 0 };
      const dto = { action: 'approve' as const };

      prisma.refund_order.findUnique.mockResolvedValue(mockRefund);
      prisma.refund_order.update.mockResolvedValue({});
      prisma.user_order.update.mockResolvedValue({});

      const result = await service.handleRefund('r1', dto, {
        user_id: 'user1',
      } as any);

      expect(result.success).toBe(true);
    });

    it('should reject refund', async () => {
      const mockRefund = { refund_id: 'r1', order_id: 'order1', status: 0 };
      const dto = { action: 'reject' as const, rejectReason: 'invalid' };

      prisma.refund_order.findUnique.mockResolvedValue(mockRefund);
      prisma.refund_order.update.mockResolvedValue({});

      const result = await service.handleRefund('r1', dto, {
        user_id: 'user1',
      } as any);

      expect(result.success).toBe(true);
    });

    it('should throw error if already handled', async () => {
      const mockRefund = { refund_id: 'r1', order_id: 'order1', status: 1 };
      const dto = { action: 'approve' as const };

      prisma.refund_order.findUnique.mockResolvedValue(mockRefund);

      await expect(
        service.handleRefund('r1', dto, { user_id: 'user1' } as any),
      ).rejects.toThrow('该退款申请已处理');
    });
  });

  describe('cancelRefund', () => {
    it('should cancel refund', async () => {
      const mockRefund = { refund_id: 'r1', user_id: 'user1', status: 0 };

      prisma.refund_order.findUnique.mockResolvedValue(mockRefund);
      prisma.refund_order.update.mockResolvedValue({});

      await service.cancelRefund('r1', { user_id: 'user1' } as any);

      expect(prisma.refund_order.update).toHaveBeenCalled();
    });

    it('should throw error if not owner', async () => {
      const mockRefund = { refund_id: 'r1', user_id: 'user2', status: 0 };

      prisma.refund_order.findUnique.mockResolvedValue(mockRefund);

      await expect(
        service.cancelRefund('r1', { user_id: 'user1' } as any),
      ).rejects.toThrow('无权操作');
    });

    it('should throw error if already handled', async () => {
      const mockRefund = { refund_id: 'r1', user_id: 'user1', status: 1 };

      prisma.refund_order.findUnique.mockResolvedValue(mockRefund);

      await expect(
        service.cancelRefund('r1', { user_id: 'user1' } as any),
      ).rejects.toThrow('该退款申请已处理，无法取消');
    });
  });
});
