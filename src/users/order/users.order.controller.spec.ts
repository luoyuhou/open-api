import { Test, TestingModule } from '@nestjs/testing';
import { UsersOrderController } from './users.order.controller';
import { UsersOrderService } from './users.order.service';

describe('OrderController', () => {
  let controller: UsersOrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersOrderController],
      providers: [UsersOrderService],
    }).compile();

    controller = module.get<UsersOrderController>(UsersOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
