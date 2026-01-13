import { Test, TestingModule } from '@nestjs/testing';
import { UsersOrderService } from './users.order.service';
import { OrderService } from '../../order/order.service';

describe('OrderService', () => {
  let service: UsersOrderService;

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
      providers: [
        UsersOrderService,
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();

    service = module.get<UsersOrderService>(UsersOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
