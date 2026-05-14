import { Test, TestingModule } from '@nestjs/testing';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { Request } from 'express';
import { UserEntity } from '../../users/entities/user.entity';
import { Pagination } from '../../common/dto/pagination';

describe('RefundController', () => {
  let controller: RefundController;
  let refundService: jest.Mocked<RefundService>;

  beforeEach(async () => {
    const mockRefundService = {
      createRefund: jest.fn(),
      getUserRefunds: jest.fn(),
      getStoreRefunds: jest.fn(),
      getRefundDetail: jest.fn(),
      handleRefund: jest.fn(),
      cancelRefund: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefundController],
      providers: [{ provide: RefundService, useValue: mockRefundService }],
    }).compile();

    controller = module.get<RefundController>(RefundController);
    refundService = module.get(RefundService) as jest.Mocked<RefundService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createRefund', () => {
    it('should create refund', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto = { orderId: 'order1', money: 100, reason: 'reason' };
      const mockRefund = { refund_id: 'r1', ...dto };
      refundService.createRefund.mockResolvedValue(mockRefund as any);

      const result = await controller.createRefund(mockRequest, dto as any);

      expect(refundService.createRefund).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual({ message: 'ok', data: mockRefund });
    });
  });

  describe('getUserRefunds', () => {
    it('should return user refunds', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockData = { list: [], total: 0 };
      refundService.getUserRefunds.mockResolvedValue(mockData as any);

      const result = await controller.getUserRefunds(mockRequest, pagination);

      expect(refundService.getUserRefunds).toHaveBeenCalledWith(
        mockUser,
        pagination,
      );
      expect(result).toEqual({ message: 'ok', data: mockData });
    });
  });

  describe('getStoreRefunds', () => {
    it('should return store refunds', async () => {
      const storeId = 'store1';
      const pagination: Pagination = {
        pageNum: 0,
        pageSize: 10,
        sorted: [],
        filtered: [],
      };
      const mockData = {
        list: [],
        total: 0,
        statusStats: { pending: 5, completed: 10 },
      };
      refundService.getStoreRefunds.mockResolvedValue(mockData as any);

      const result = await controller.getStoreRefunds(storeId, pagination);

      expect(refundService.getStoreRefunds).toHaveBeenCalledWith(
        storeId,
        pagination,
      );
      expect(result).toEqual({ message: 'ok', data: mockData });
    });
  });

  describe('getRefundDetail', () => {
    it('should return refund detail', async () => {
      const refundId = 'r1';
      const mockDetail = { refund_id: 'r1', order: {}, orderItems: [] };
      refundService.getRefundDetail.mockResolvedValue(mockDetail as any);

      const result = await controller.getRefundDetail(refundId);

      expect(refundService.getRefundDetail).toHaveBeenCalledWith(refundId);
      expect(result).toEqual({ message: 'ok', data: mockDetail });
    });
  });

  describe('handleRefund', () => {
    it('should handle refund', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      const dto = { action: 'approve' as const };
      refundService.handleRefund.mockResolvedValue({ success: true });

      const result = await controller.handleRefund('r1', mockRequest, dto);

      expect(refundService.handleRefund).toHaveBeenCalledWith(
        'r1',
        dto,
        mockUser,
      );
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('cancelRefund', () => {
    it('should cancel refund', async () => {
      const mockUser = { user_id: 'user123' } as UserEntity;
      const mockRequest = { user: mockUser } as unknown as Request;
      refundService.cancelRefund.mockResolvedValue(undefined);

      const result = await controller.cancelRefund('r1', mockRequest);

      expect(refundService.cancelRefund).toHaveBeenCalledWith('r1', mockUser);
      expect(result).toEqual({ message: 'ok' });
    });
  });
});
