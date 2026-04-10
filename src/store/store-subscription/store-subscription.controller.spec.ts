import { Test, TestingModule } from '@nestjs/testing';
import { StoreServiceController } from './store-subscription.controller';
import { StoreSubscriptionService } from './store-subscription.service';
import {
  CreateStoreServicePlanDto,
  CreateStoreServiceSubscriptionDto,
  ListStoreServiceInvoicesDto,
  ListStoreServiceSubscriptionsDto,
  PayStoreServiceInvoiceDto,
  UpdateStoreServicePlanStatusDto,
  ListStoreServiceContractsDto,
  CreateStoreServiceContractDto,
} from '../dto/store-subscription.dto';

describe('StoreServiceController', () => {
  let controller: StoreServiceController;
  let storeSubscriptionService: jest.Mocked<StoreSubscriptionService>;

  beforeEach(async () => {
    const mockStoreService = {
      listPlans: jest.fn(),
      createPlan: jest.fn(),
      updatePlanStatus: jest.fn(),
      listSubscriptions: jest.fn(),
      createSubscription: jest.fn(),
      terminateSubscription: jest.fn(),
      listInvoices: jest.fn(),
      payInvoice: jest.fn(),
      listContracts: jest.fn(),
      createContract: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreServiceController],
      providers: [
        { provide: StoreSubscriptionService, useValue: mockStoreService },
      ],
    }).compile();

    controller = module.get<StoreServiceController>(StoreServiceController);
    storeSubscriptionService = module.get(
      StoreSubscriptionService,
    ) as jest.Mocked<StoreSubscriptionService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listPlans', () => {
    it('should list all plans', async () => {
      const mockPlans = [{ plan_id: 'plan-uuid-1', name: 'Basic' }];
      storeSubscriptionService.listPlans.mockResolvedValue(mockPlans as any);

      const result = await controller.listPlans();

      expect(storeSubscriptionService.listPlans).toHaveBeenCalled();
      expect(result).toEqual({ data: mockPlans });
    });
  });

  describe('createPlan', () => {
    it('should create a new plan', async () => {
      const dto: CreateStoreServicePlanDto = {
        name: 'Pro',
        monthly_fee: 0,
        description: 'description',
      };
      const mockPlan = { plan_id: 'plan-uuid-2', ...dto };
      storeSubscriptionService.createPlan.mockResolvedValue(mockPlan as any);

      const result = await controller.createPlan(dto);

      expect(storeSubscriptionService.createPlan).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: mockPlan });
    });
  });

  describe('updatePlanStatus', () => {
    it('should update plan status', async () => {
      const id = 1;
      const dto: UpdateStoreServicePlanStatusDto = { is_active: false };
      const mockPlan = { id, plan_id: 'plan-uuid-1', is_active: false };
      storeSubscriptionService.updatePlanStatus.mockResolvedValue(
        mockPlan as any,
      );

      const result = await controller.updatePlanStatus(id, dto);

      expect(storeSubscriptionService.updatePlanStatus).toHaveBeenCalledWith(
        id,
        false,
      );
      expect(result).toEqual({ data: mockPlan });
    });
  });

  describe('listSubscriptions', () => {
    it('should list subscriptions with query', async () => {
      const query: ListStoreServiceSubscriptionsDto = {
        store_id: 'store123',
        status: 1,
        page: 1,
        pageSize: 10,
      };
      const mockResult = {
        items: [{ subscription_id: 1 }],
        total: 1,
        page: 1,
        pageSize: 10,
      };
      storeSubscriptionService.listSubscriptions.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.listSubscriptions(query);

      expect(storeSubscriptionService.listSubscriptions).toHaveBeenCalledWith({
        store_id: 'store123',
        status: 1,
        page: 1,
        pageSize: 10,
      });
      expect(result).toEqual({
        data: mockResult.items,
        total: 1,
        page: 1,
        pageSize: 10,
      });
    });
  });

  describe('createSubscription', () => {
    it('should create subscription', async () => {
      const dto: CreateStoreServiceSubscriptionDto = {
        store_id: 'store123',
        plan_id: 'plan-uuid-1',
        start_date: new Date(),
      };
      const mockSubscription = { subscription_id: 1, store_id: 'store123' };
      storeSubscriptionService.createSubscription.mockResolvedValue(
        mockSubscription as any,
      );

      const result = await controller.createSubscription(dto);

      expect(storeSubscriptionService.createSubscription).toHaveBeenCalledWith({
        store_id: 'store123',
        plan_id: 'plan-uuid-1',
        start_date: dto.start_date,
      });
      expect(result).toEqual({ data: mockSubscription });
    });
  });

  describe('terminateSubscription', () => {
    it('should terminate subscription', async () => {
      const id = 1;
      const mockSubscription = { subscription_id: id, status: 'terminated' };
      storeSubscriptionService.terminateSubscription.mockResolvedValue(
        mockSubscription as any,
      );

      const result = await controller.terminateSubscription(id);

      expect(
        storeSubscriptionService.terminateSubscription,
      ).toHaveBeenCalledWith(id);
      expect(result).toEqual({ data: mockSubscription });
    });
  });

  describe('listInvoices', () => {
    it('should list invoices with query', async () => {
      const query: ListStoreServiceInvoicesDto = {
        store_id: 'store123',
        status: 1,
        page: 1,
        pageSize: 10,
      };
      const mockResult = {
        items: [{ invoice_id: 1 }],
        total: 1,
        page: 1,
        pageSize: 10,
      };
      storeSubscriptionService.listInvoices.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.listInvoices(query);

      expect(storeSubscriptionService.listInvoices).toHaveBeenCalledWith({
        store_id: 'store123',
        status: 1,
        page: 1,
        pageSize: 10,
      });
      expect(result).toEqual({
        data: mockResult.items,
        total: 1,
        page: 1,
        pageSize: 10,
      });
    });
  });

  describe('payInvoice', () => {
    it('should pay invoice', async () => {
      const id = 1;
      const dto: PayStoreServiceInvoiceDto = {
        amount: 99.99,
        method: 'cod',
      };
      const mockInvoice = { invoice_id: id, status: 'paid' };
      storeSubscriptionService.payInvoice.mockResolvedValue(mockInvoice as any);

      const result = await controller.payInvoice(id, dto);

      expect(storeSubscriptionService.payInvoice).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual({ data: mockInvoice });
    });
  });

  describe('listContracts', () => {
    it('should list contracts with query', async () => {
      const query: ListStoreServiceContractsDto = {
        store_id: 'store123',
        status: 1,
        page: 1,
        pageSize: 10,
      };
      const mockResult = {
        items: [{ contract_id: 1 }],
        total: 1,
        page: 1,
        pageSize: 10,
      };
      storeSubscriptionService.listContracts.mockResolvedValue(
        mockResult as any,
      );

      const result = await controller.listContracts(query);

      expect(storeSubscriptionService.listContracts).toHaveBeenCalledWith({
        store_id: 'store123',
        status: 1,
        page: 1,
        pageSize: 10,
      });
      expect(result).toEqual({
        data: mockResult.items,
        total: 1,
        page: 1,
        pageSize: 10,
      });
    });
  });

  describe('createContract', () => {
    it('should create contract', async () => {
      const dto: CreateStoreServiceContractDto = {
        store_id: 'store123',
        plan_id: 'plan-uuid-1',
        start_date: new Date(),
        end_date: new Date(),
        total_amount: 100,
        sign_type: 1,
      };
      const mockContract = { contract_id: 1, store_id: 'store123' };
      storeSubscriptionService.createContract.mockResolvedValue(
        mockContract as any,
      );

      const result = await controller.createContract(dto);

      expect(storeSubscriptionService.createContract).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: mockContract });
    });
  });
});
