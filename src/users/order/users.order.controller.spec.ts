import { Test, TestingModule } from '@nestjs/testing';
import { UsersOrderController } from './users.order.controller';
import { UsersOrderService } from './users.order.service';
import { OrderService } from '../../order/order.service';

describe('OrderController', () => {
  let controller: UsersOrderController;

  // Mock OrderService
  const mockOrderService = {
    create: jest.fn(),
    findAll: jest.fn(),
    orderDetail: jest.fn(),
    cancel: jest.fn(),
    accept: jest.fn(),
    delivery: jest.fn(),
    receive: jest.fn(),
    finish: jest.fn(),
    remove: jest.fn(),
    actionAdapter: jest.fn(),
    orderDetailInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersOrderController],
      providers: [
        UsersOrderService,
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();

    controller = module.get<UsersOrderController>(UsersOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
