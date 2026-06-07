import { Test, TestingModule } from '@nestjs/testing';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';

describe('MemberController', () => {
  let controller: MemberController;
  let service: MemberService;

  beforeEach(async () => {
    const mockMemberService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      recharge: jest.fn(),
      findRecharges: jest.fn(),
      findMemberOrders: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemberController],
      providers: [{ provide: MemberService, useValue: mockMemberService }],
    }).compile();

    controller = module.get<MemberController>(MemberController);
    service = module.get<MemberService>(MemberService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service create', async () => {
      const dto = { store_id: 's1', phone: '138', name: 'N' };
      await controller.create(dto as any);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('recharge', () => {
    it('should call service recharge', async () => {
      const dto = { member_id: 'm1', amount: 100 };
      await controller.recharge(dto as any);
      expect(service.recharge).toHaveBeenCalledWith(dto);
    });
  });

  describe('findMemberOrders', () => {
    it('should return member orders', async () => {
      const memberId = 'm1';
      (service.findMemberOrders as jest.Mock).mockResolvedValue([]);
      const result = await controller.findMemberOrders(memberId);
      expect(service.findMemberOrders).toHaveBeenCalledWith(memberId);
      expect(result).toEqual([]);
    });
  });
});
