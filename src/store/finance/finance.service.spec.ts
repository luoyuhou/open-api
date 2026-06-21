import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('FinanceService', () => {
  let service: FinanceService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        {
          provide: PrismaService,
          useValue: {
            store_finance_record: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            report_store_finance_daily: {
              findMany: jest.fn(),
              count: jest.fn(),
              upsert: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getProfitLossSummary', () => {
    it('应按月从日汇总表读取盈亏与日历', async () => {
      (prisma.report_store_finance_daily.count as jest.Mock).mockResolvedValue(
        2,
      );
      (
        prisma.report_store_finance_daily.findMany as jest.Mock
      ).mockResolvedValue([
        {
          record_date: '2026-06-01',
          revenue: 15000,
          ingredient_cost: 0,
          rent_amount: 200000,
          water_amount: 5000,
          electricity_amount: 10000,
        },
        {
          record_date: '2026-06-02',
          revenue: 0,
          ingredient_cost: 3000,
          rent_amount: 0,
          water_amount: 0,
          electricity_amount: 0,
        },
      ]);

      const result = await service.getProfitLossSummary('s1', 2026, 6);

      expect(prisma.report_store_finance_daily.findMany).toHaveBeenCalledWith({
        where: {
          store_id: 's1',
          record_date: { startsWith: '2026-06' },
        },
      });
      expect(result.revenue).toBe(150);
      expect(result.ingredient_cost).toBe(30);
      expect(result.overhead.total).toBe(2150);
      expect(result.profit).toBe(-2030);
      expect(result.calendar?.days[0]).toMatchObject({
        day: 1,
        revenue: 150,
        expense: 2150,
      });
      expect(result.calendar?.days[1]).toMatchObject({
        day: 2,
        revenue: 0,
        expense: 30,
      });
    });

    it('缺少年份时应报错', async () => {
      await expect(
        service.getProfitLossSummary('s1', NaN),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('应按年从日汇总表返回12个月方格数据', async () => {
      (prisma.report_store_finance_daily.count as jest.Mock).mockResolvedValue(
        2,
      );
      (
        prisma.report_store_finance_daily.findMany as jest.Mock
      ).mockResolvedValue([
        {
          record_date: '2026-01-15',
          revenue: 10000,
          ingredient_cost: 0,
          rent_amount: 0,
          water_amount: 0,
          electricity_amount: 0,
        },
        {
          record_date: '2026-02-10',
          revenue: 0,
          ingredient_cost: 2000,
          rent_amount: 0,
          water_amount: 0,
          electricity_amount: 0,
        },
      ]);

      const result = await service.getProfitLossSummary('s1', 2026);

      expect(result.year_calendar?.months).toHaveLength(12);
      expect(result.year_calendar?.months[0]).toMatchObject({
        month: 1,
        revenue: 100,
        expense: 0,
      });
      expect(result.year_calendar?.months[1]).toMatchObject({
        month: 2,
        revenue: 0,
        expense: 20,
      });
    });

    it('无日汇总时应从财务明细回填', async () => {
      (prisma.report_store_finance_daily.count as jest.Mock).mockResolvedValue(
        0,
      );
      (prisma.store_finance_record.count as jest.Mock).mockResolvedValue(1);
      (prisma.store_finance_record.findMany as jest.Mock)
        .mockResolvedValueOnce([{ record_date: '2026-06-01' }])
        .mockResolvedValueOnce([
          {
            type: 'daily_revenue',
            record_date: '2026-06-01',
            alipay: 5000,
            wechat: 0,
            cash: 0,
            amount: 0,
            rent_amount: 0,
            water_amount: 0,
            electricity_amount: 0,
          },
        ]);
      (prisma.report_store_finance_daily.upsert as jest.Mock).mockResolvedValue(
        {},
      );
      (
        prisma.report_store_finance_daily.findMany as jest.Mock
      ).mockResolvedValue([
        {
          record_date: '2026-06-01',
          revenue: 5000,
          ingredient_cost: 0,
          rent_amount: 0,
          water_amount: 0,
          electricity_amount: 0,
        },
      ]);

      const result = await service.getProfitLossSummary('s1', 2026, 6);

      expect(prisma.report_store_finance_daily.upsert).toHaveBeenCalled();
      expect(result.revenue).toBe(50);
    });
  });
});
