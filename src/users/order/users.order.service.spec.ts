import { Test, TestingModule } from '@nestjs/testing';
import { UsersOrderService } from './users.order.service';

describe('OrderService', () => {
  let service: UsersOrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersOrderService],
    }).compile();

    service = module.get<UsersOrderService>(UsersOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
