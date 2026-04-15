import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesService } from './schedules.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersFetchService } from '../users/users-fetch/users-fetch.service';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let prisma: any;
  let usersFetchService: any;

  beforeEach(async () => {
    const mockPrisma = {
      $queryRaw: jest.fn(),
      store_rating: {
        upsert: jest.fn(),
      },
    };

    const mockUsersFetchService = {
      dailyUsersFetch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersFetchService, useValue: mockUsersFetchService },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
    prisma = module.get(PrismaService);
    usersFetchService = module.get(UsersFetchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCron', () => {
    it('should execute without error', () => {
      expect(() => service.handleCron()).not.toThrow();
    });
  });

  describe('reportUserDailyFetch', () => {
    it('should call dailyUsersFetch', () => {
      usersFetchService.dailyUsersFetch.mockResolvedValue(undefined);

      service.reportUserDailyFetch();

      expect(usersFetchService.dailyUsersFetch).toHaveBeenCalled();
    });
  });

  describe('refreshStoreRatings', () => {
    it('should refresh store ratings', async () => {
      const mockRows = [
        { store_id: 'store1', order_count: 10 },
        { store_id: 'store2', order_count: 20 },
      ];

      prisma.$queryRaw.mockResolvedValue(mockRows);
      prisma.store_rating.upsert.mockResolvedValue({});

      await service.refreshStoreRatings();

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.store_rating.upsert).toHaveBeenCalledTimes(2);
    });
  });
});
