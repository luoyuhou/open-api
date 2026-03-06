import { Test, TestingModule } from '@nestjs/testing';
import { StoreServiceController } from './store-subscription.controller';
import { StoreServiceService } from './store-subscription.service';
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
  let storeService: jest.Mocked<StoreServiceService>;

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
      providers: [{ provide: StoreServiceService, useValue: mockStoreService }],
    }).compile();

    controller = module.get<StoreServiceController>(StoreServiceController);
    storeService = module.get(
      StoreServiceService,
    ) as jest.Mocked<StoreServiceService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listPlans', () => {
    it('should list all plans', async () => {
      const mockPlans = [{ plan_id: 1, name: 'Basic' }];
      storeService.listPlans.mockResolvedValue(mockPlans as any);

      const result = await controller.listPlans();

      expect(storeService.listPlans).toHaveBeenCalled();
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
      const mockPlan = { plan_id: 2, ...dto };
      storeService.createPlan.mockResolvedValue(mockPlan as any);

      const result = await controller.createPlan(dto);

      expect(storeService.createPlan).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: mockPlan });
    });
  });

  describe('updatePlanStatus', () => {
    it('should update plan status', async () => {
      const id = 1;
      const dto: UpdateStoreServicePlanStatusDto = { is_active: false };
      const mockPlan = { plan_id: id, is_active: false };
      storeService.updatePlanStatus.mockResolvedValue(mockPlan as any);

      const result = await controller.updatePlanStatus(id, dto);

      expect(storeService.updatePlanStatus).toHaveBeenCalledWith(id, false);
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
      storeService.listSubscriptions.mockResolvedValue(mockResult as any);

      const result = await controller.listSubscriptions(query);

      expect(storeService.listSubscriptions).toHaveBeenCalledWith({
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
        plan_id: 1,
        start_date: new Date(),
      };
      const mockSubscription = { subscription_id: 1, store_id: 'store123' };
      storeService.createSubscription.mockResolvedValue(
        mockSubscription as any,
      );

      const result = await controller.createSubscription(dto);

      expect(storeService.createSubscription).toHaveBeenCalledWith({
        store_id: 'store123',
        plan_id: 1,
        start_date: dto.start_date,
      });
      expect(result).toEqual({ data: mockSubscription });
    });
  });

  describe('terminateSubscription', () => {
    it('should terminate subscription', async () => {
      const id = 1;
      const mockSubscription = { subscription_id: id, status: 'terminated' };
      storeService.terminateSubscription.mockResolvedValue(
        mockSubscription as any,
      );

      const result = await controller.terminateSubscription(id);

      expect(storeService.terminateSubscription).toHaveBeenCalledWith(id);
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
      storeService.listInvoices.mockResolvedValue(mockResult as any);

      const result = await controller.listInvoices(query);

      expect(storeService.listInvoices).toHaveBeenCalledWith({
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
      storeService.payInvoice.mockResolvedValue(mockInvoice as any);

      const result = await controller.payInvoice(id, dto);

      expect(storeService.payInvoice).toHaveBeenCalledWith(id, dto);
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
      storeService.listContracts.mockResolvedValue(mockResult as any);

      const result = await controller.listContracts(query);

      expect(storeService.listContracts).toHaveBeenCalledWith({
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
        plan_id: 1,
        start_date: new Date(),
        end_date: new Date(),
        total_amount: 100,
        sign_type: 1,
      };
      const mockContract = { contract_id: 1, store_id: 'store123' };
      storeService.createContract.mockResolvedValue(mockContract as any);

      const result = await controller.createContract(dto);

      expect(storeService.createContract).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ data: mockContract });
    });
  });
});
