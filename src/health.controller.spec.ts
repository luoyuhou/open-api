import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { CacheService } from './common/cache-manager/cache.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let typeOrmHealthIndicator: jest.Mocked<TypeOrmHealthIndicator>;
  let memoryHealthIndicator: jest.Mocked<MemoryHealthIndicator>;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };
    const mockTypeOrmHealthIndicator = {
      pingCheck: jest.fn(),
    };
    const mockMemoryHealthIndicator = {
      checkRSS: jest.fn(),
    };
    const mockCacheService = {
      client: { status: 'ready' },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockTypeOrmHealthIndicator,
        },
        { provide: MemoryHealthIndicator, useValue: mockMemoryHealthIndicator },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(
      HealthCheckService,
    ) as jest.Mocked<HealthCheckService>;
    typeOrmHealthIndicator = module.get(
      TypeOrmHealthIndicator,
    ) as jest.Mocked<TypeOrmHealthIndicator>;
    memoryHealthIndicator = module.get(
      MemoryHealthIndicator,
    ) as jest.Mocked<MemoryHealthIndicator>;
    cacheService = module.get(CacheService) as jest.Mocked<CacheService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health check result with redis up', async () => {
      const mockResult = {
        status: 'ok',
        info: { database: { status: 'up' }, mem_rss: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' }, mem_rss: { status: 'up' } },
      };
      healthCheckService.check.mockResolvedValue(mockResult as any);
      cacheService.client.status = 'ready';

      const result = await controller.check();

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);
      expect(result.status).toBe('ok');
      expect(result.info['redis']).toEqual({ status: 'up' });
      expect(result.details['redis']).toEqual({ status: 'up' });
    });

    it('should return health check result with redis down', async () => {
      const mockResult = {
        status: 'ok',
        info: { database: { status: 'up' }, mem_rss: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' }, mem_rss: { status: 'up' } },
      };
      healthCheckService.check.mockResolvedValue(mockResult as any);
      cacheService.client.status = 'close';

      const result = await controller.check();

      expect(result.status).toBe('error');
      expect(result.error['redis']).toEqual({ status: 'down' });
      expect(result.details['redis']).toEqual({ status: 'down' });
    });
  });
});
