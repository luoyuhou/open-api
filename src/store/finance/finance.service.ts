import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertFinanceRecordDto } from './dto/upsert-finance-record.dto';
import { E_FINANCE_TYPE, FinanceType } from './const';
import { v4 } from 'uuid';

type RawRecord = {
  record_id: string;
  store_id: string;
  type: string;
  record_date: string;
  item_name: string;
  alipay: number;
  wechat: number;
  cash: number;
  amount: number;
  rent_amount: number;
  water_volume: number;
  water_amount: number;
  electricity_kwh: number;
  electricity_amount: number;
  remark: string | null;
};

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  private toYuan(cents: number) {
    return Number((cents / 100).toFixed(2));
  }

  private toCents(yuan?: number) {
    if (yuan === undefined || yuan === null || Number.isNaN(Number(yuan))) {
      return 0;
    }
    return Math.round(Number(yuan) * 100);
  }

  private overheadTotalCents(record: RawRecord) {
    return record.rent_amount + record.water_amount + record.electricity_amount;
  }

  private formatRecord(record: RawRecord) {
    const totalRevenue =
      record.type === E_FINANCE_TYPE.daily_revenue
        ? record.alipay + record.wechat + record.cash
        : 0;

    const isOverhead = record.type === E_FINANCE_TYPE.monthly_overhead;
    const overheadTotal = isOverhead ? this.overheadTotalCents(record) : 0;

    return {
      record_id: record.record_id,
      store_id: record.store_id,
      type: record.type,
      record_date: record.record_date,
      item_name: record.item_name || '',
      alipay: this.toYuan(record.alipay),
      wechat: this.toYuan(record.wechat),
      cash: this.toYuan(record.cash),
      amount: this.toYuan(record.amount),
      rent_amount: this.toYuan(record.rent_amount),
      water_volume: Number(record.water_volume || 0),
      water_amount: this.toYuan(record.water_amount),
      electricity_kwh: Number(record.electricity_kwh || 0),
      electricity_amount: this.toYuan(record.electricity_amount),
      total: this.toYuan(
        record.type === E_FINANCE_TYPE.daily_revenue
          ? totalRevenue
          : isOverhead
          ? overheadTotal
          : record.amount,
      ),
      remark: record.remark || '',
    };
  }

  private groupIngredientByDay(
    items: ReturnType<FinanceService['formatRecord']>[],
  ) {
    const map = new Map<
      string,
      { date: string; dayTotal: number; items: typeof items }
    >();

    items.forEach((item) => {
      if (!map.has(item.record_date)) {
        map.set(item.record_date, {
          date: item.record_date,
          dayTotal: 0,
          items: [],
        });
      }
      const group = map.get(item.record_date)!;
      group.items.push(item);
      group.dayTotal = Number((group.dayTotal + item.amount).toFixed(2));
    });

    return Array.from(map.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }

  async list(
    storeId: string,
    type: FinanceType,
    year?: number,
    month?: number,
  ) {
    const where: {
      store_id: string;
      type: string | { in: string[] };
      record_date?: { startsWith: string };
    } = {
      store_id: storeId,
      type,
    };

    if (type === E_FINANCE_TYPE.monthly_overhead) {
      where.type = {
        in: [
          E_FINANCE_TYPE.monthly_overhead,
          E_FINANCE_TYPE.rent,
          E_FINANCE_TYPE.utilities,
        ],
      };
    }

    if (year && month) {
      const monthStr = String(month).padStart(2, '0');
      where.record_date = { startsWith: `${year}-${monthStr}` };
    } else if (year) {
      where.record_date = { startsWith: `${year}-` };
    }

    const records = await this.prisma.store_finance_record.findMany({
      where,
      orderBy: [{ record_date: 'desc' }, { create_date: 'desc' }],
    });

    let items = records.map((record) =>
      this.formatRecord(record as unknown as RawRecord),
    );

    if (type === E_FINANCE_TYPE.monthly_overhead) {
      items = this.mergeLegacyOverhead(items);
    }

    const summary = items.reduce(
      (acc, item) => {
        if (type === E_FINANCE_TYPE.daily_revenue) {
          acc.alipay += item.alipay;
          acc.wechat += item.wechat;
          acc.cash += item.cash;
          acc.total += item.total;
        } else if (type === E_FINANCE_TYPE.monthly_overhead) {
          acc.rent += item.rent_amount;
          acc.water += item.water_amount;
          acc.electricity += item.electricity_amount;
          acc.water_volume += item.water_volume;
          acc.electricity_kwh += item.electricity_kwh;
          acc.total += item.total;
        } else {
          acc.total += item.amount;
        }
        return acc;
      },
      {
        alipay: 0,
        wechat: 0,
        cash: 0,
        rent: 0,
        water: 0,
        electricity: 0,
        water_volume: 0,
        electricity_kwh: 0,
        total: 0,
      },
    );

    const result: {
      items: typeof items;
      summary: Record<string, number>;
      grouped?: ReturnType<FinanceService['groupIngredientByDay']>;
    } = {
      items,
      summary: {
        alipay: Number(summary.alipay.toFixed(2)),
        wechat: Number(summary.wechat.toFixed(2)),
        cash: Number(summary.cash.toFixed(2)),
        rent: Number(summary.rent.toFixed(2)),
        water: Number(summary.water.toFixed(2)),
        electricity: Number(summary.electricity.toFixed(2)),
        water_volume: Number(summary.water_volume.toFixed(2)),
        electricity_kwh: Number(summary.electricity_kwh.toFixed(2)),
        total: Number(summary.total.toFixed(2)),
      },
    };

    if (type === E_FINANCE_TYPE.ingredient_cost) {
      result.grouped = this.groupIngredientByDay(items);
    }

    return result;
  }

  private mergeLegacyOverhead(
    items: ReturnType<FinanceService['formatRecord']>[],
  ) {
    const map = new Map<string, ReturnType<FinanceService['formatRecord']>>();

    items.forEach((item) => {
      const key = item.record_date;
      const existing = map.get(key);

      if (item.type === E_FINANCE_TYPE.rent) {
        const rentAmount = item.amount;
        if (existing) {
          existing.rent_amount = Number(
            (existing.rent_amount + rentAmount).toFixed(2),
          );
          existing.total = Number(
            (
              existing.rent_amount +
              existing.water_amount +
              existing.electricity_amount
            ).toFixed(2),
          );
        } else {
          map.set(key, {
            ...item,
            type: E_FINANCE_TYPE.monthly_overhead,
            rent_amount: rentAmount,
            water_volume: 0,
            water_amount: 0,
            electricity_kwh: 0,
            electricity_amount: 0,
            total: rentAmount,
          });
        }
        return;
      }

      if (item.type === E_FINANCE_TYPE.utilities) {
        const elecAmount = item.amount;
        if (existing) {
          existing.electricity_amount = Number(
            (existing.electricity_amount + elecAmount).toFixed(2),
          );
          existing.total = Number(
            (
              existing.rent_amount +
              existing.water_amount +
              existing.electricity_amount
            ).toFixed(2),
          );
        } else {
          map.set(key, {
            ...item,
            type: E_FINANCE_TYPE.monthly_overhead,
            rent_amount: 0,
            water_volume: 0,
            water_amount: 0,
            electricity_kwh: 0,
            electricity_amount: elecAmount,
            total: elecAmount,
          });
        }
        return;
      }

      if (existing && existing.record_id !== item.record_id) {
        existing.rent_amount = Number(
          (existing.rent_amount + item.rent_amount).toFixed(2),
        );
        existing.water_volume = Number(
          (existing.water_volume + item.water_volume).toFixed(2),
        );
        existing.water_amount = Number(
          (existing.water_amount + item.water_amount).toFixed(2),
        );
        existing.electricity_kwh = Number(
          (existing.electricity_kwh + item.electricity_kwh).toFixed(2),
        );
        existing.electricity_amount = Number(
          (existing.electricity_amount + item.electricity_amount).toFixed(2),
        );
        existing.total = Number(
          (
            existing.rent_amount +
            existing.water_amount +
            existing.electricity_amount
          ).toFixed(2),
        );
      } else {
        map.set(key, { ...item });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      b.record_date.localeCompare(a.record_date),
    );
  }

  async upsert(dto: UpsertFinanceRecordDto) {
    const { store_id, type, record_date, remark, record_id } = dto;
    const itemName = (dto.item_name || '').trim();

    if (type === E_FINANCE_TYPE.daily_revenue) {
      const hasValue =
        dto.alipay !== undefined ||
        dto.wechat !== undefined ||
        dto.cash !== undefined;
      if (!hasValue) {
        throw new BadRequestException('请填写至少一项营业额');
      }
    } else if (type === E_FINANCE_TYPE.ingredient_cost) {
      if (!itemName) {
        throw new BadRequestException('请填写食材名称');
      }
      if (dto.amount === undefined || dto.amount === null) {
        throw new BadRequestException('请填写金额');
      }
    } else if (type === E_FINANCE_TYPE.monthly_overhead) {
      const hasOverhead =
        (dto.rent_amount !== undefined && dto.rent_amount !== null) ||
        (dto.water_amount !== undefined && dto.water_amount !== null) ||
        (dto.electricity_amount !== undefined &&
          dto.electricity_amount !== null);
      if (!hasOverhead) {
        throw new BadRequestException('请至少填写一项费用');
      }
    } else if (dto.amount === undefined || dto.amount === null) {
      throw new BadRequestException('请填写金额');
    }

    const rentCents = this.toCents(dto.rent_amount);
    const waterCents = this.toCents(dto.water_amount);
    const elecCents = this.toCents(dto.electricity_amount);
    const totalCents =
      type === E_FINANCE_TYPE.monthly_overhead
        ? rentCents + waterCents + elecCents
        : this.toCents(dto.amount);

    const data = {
      alipay: this.toCents(dto.alipay),
      wechat: this.toCents(dto.wechat),
      cash: this.toCents(dto.cash),
      amount: totalCents,
      rent_amount: rentCents,
      water_volume: Number(dto.water_volume || 0),
      water_amount: waterCents,
      electricity_kwh: Number(dto.electricity_kwh || 0),
      electricity_amount: elecCents,
      item_name: type === E_FINANCE_TYPE.ingredient_cost ? itemName : '',
      remark: remark || null,
      update_date: new Date(),
    };

    if (record_id) {
      const existingById = await this.prisma.store_finance_record.findUnique({
        where: { record_id },
      });
      if (!existingById || existingById.store_id !== store_id) {
        throw new BadRequestException('记录不存在');
      }

      if (
        type === E_FINANCE_TYPE.ingredient_cost &&
        itemName !== existingById.item_name
      ) {
        const duplicate = await this.prisma.store_finance_record.findFirst({
          where: { store_id, type, record_date, item_name: itemName },
        });
        if (duplicate && duplicate.record_id !== record_id) {
          throw new BadRequestException('该日期已有同名食材，请修改名称');
        }
      }

      const updated = await this.prisma.store_finance_record.update({
        where: { record_id },
        data: {
          ...data,
          record_date,
          type:
            type === E_FINANCE_TYPE.monthly_overhead
              ? E_FINANCE_TYPE.monthly_overhead
              : type,
        },
      });
      await this.afterFinanceMutation(store_id, [
        record_date,
        existingById.record_date,
      ]);
      return this.formatRecord(updated as unknown as RawRecord);
    }

    const existing = await this.prisma.store_finance_record.findFirst({
      where: {
        store_id,
        type:
          type === E_FINANCE_TYPE.monthly_overhead
            ? E_FINANCE_TYPE.monthly_overhead
            : type,
        record_date,
        item_name: type === E_FINANCE_TYPE.ingredient_cost ? itemName : '',
      },
    });

    if (existing) {
      const updated = await this.prisma.store_finance_record.update({
        where: { record_id: existing.record_id },
        data,
      });
      await this.afterFinanceMutation(store_id, [record_date]);
      return this.formatRecord(updated as unknown as RawRecord);
    }

    const created = await this.prisma.store_finance_record.create({
      data: {
        record_id: `finance-${v4()}`,
        store_id,
        type,
        record_date,
        ...data,
      },
    });

    await this.afterFinanceMutation(store_id, [record_date]);
    return this.formatRecord(created as unknown as RawRecord);
  }

  async remove(recordId: string) {
    const record = await this.prisma.store_finance_record.findUnique({
      where: { record_id: recordId },
    });
    if (!record) {
      throw new BadRequestException('记录不存在');
    }
    await this.prisma.store_finance_record.delete({
      where: { record_id: recordId },
    });
    await this.afterFinanceMutation(record.store_id, [record.record_date]);
    return { success: true };
  }

  /** 盈亏汇总：收入 − 食材成本 − 房租水电（读日汇总报表） */
  async getProfitLossSummary(storeId: string, year: number, month?: number) {
    if (!year || Number.isNaN(year)) {
      throw new BadRequestException('请指定年份');
    }

    await this.ensureFinanceReports(storeId);

    const datePrefix = month
      ? `${year}-${String(month).padStart(2, '0')}`
      : `${year}-`;

    const dailyRows = await this.prisma.report_store_finance_daily.findMany({
      where: {
        store_id: storeId,
        record_date: { startsWith: datePrefix },
      },
    });

    let revenue = 0;
    let ingredientCost = 0;
    let rent = 0;
    let water = 0;
    let electricity = 0;

    dailyRows.forEach((row) => {
      revenue += this.toYuan(row.revenue);
      ingredientCost += this.toYuan(row.ingredient_cost);
      rent += this.toYuan(row.rent_amount);
      water += this.toYuan(row.water_amount);
      electricity += this.toYuan(row.electricity_amount);
    });

    const round = (n: number) => Number(n.toFixed(2));
    const overheadTotal = rent + water + electricity;
    const totalExpense = ingredientCost + overheadTotal;
    const profit = revenue - totalExpense;

    const result: {
      year: number;
      month: number | null;
      period_label: string;
      revenue: number;
      ingredient_cost: number;
      overhead: {
        rent: number;
        water: number;
        electricity: number;
        total: number;
      };
      total_expense: number;
      profit: number;
      calendar?: ReturnType<FinanceService['buildMonthlyCalendarFromDaily']>;
      year_calendar?: ReturnType<
        FinanceService['buildYearlyCalendarFromDaily']
      >;
    } = {
      year,
      month: month ?? null,
      period_label: month ? `${year}年${month}月` : `${year}年`,
      revenue: round(revenue),
      ingredient_cost: round(ingredientCost),
      overhead: {
        rent: round(rent),
        water: round(water),
        electricity: round(electricity),
        total: round(overheadTotal),
      },
      total_expense: round(totalExpense),
      profit: round(profit),
    };

    if (month) {
      result.calendar = this.buildMonthlyCalendarFromDaily(
        dailyRows,
        year,
        month,
      );
    } else {
      result.year_calendar = this.buildYearlyCalendarFromDaily(dailyRows, year);
    }

    return result;
  }

  private normalizeFinanceDate(recordDate: string) {
    return String(recordDate).slice(0, 10);
  }

  private async afterFinanceMutation(storeId: string, dates: string[]) {
    const uniqueDates = [
      ...new Set(
        dates.map((d) => this.normalizeFinanceDate(d)).filter(Boolean),
      ),
    ];
    for (const date of uniqueDates) {
      await this.syncFinanceDailyReport(storeId, date);
    }
  }

  private async ensureFinanceReports(storeId: string) {
    const reportCount = await this.prisma.report_store_finance_daily.count({
      where: { store_id: storeId },
    });
    if (reportCount > 0) {
      return;
    }
    const financeCount = await this.prisma.store_finance_record.count({
      where: { store_id: storeId },
    });
    if (financeCount > 0) {
      await this.rebuildFinanceDailyReports(storeId);
    }
  }

  private async rebuildFinanceDailyReports(storeId: string) {
    const records = await this.prisma.store_finance_record.findMany({
      where: { store_id: storeId },
      select: { record_date: true },
    });
    const dates = [
      ...new Set(records.map((r) => this.normalizeFinanceDate(r.record_date))),
    ];
    for (const date of dates) {
      await this.syncFinanceDailyReport(storeId, date);
    }
  }

  private accumFromRawRecord(
    bucket: {
      revenue: number;
      ingredient_cost: number;
      rent_amount: number;
      water_amount: number;
      electricity_amount: number;
    },
    raw: RawRecord,
  ) {
    switch (raw.type) {
      case E_FINANCE_TYPE.daily_revenue:
        bucket.revenue += raw.alipay + raw.wechat + raw.cash;
        break;
      case E_FINANCE_TYPE.ingredient_cost:
        bucket.ingredient_cost += raw.amount;
        break;
      case E_FINANCE_TYPE.monthly_overhead:
        bucket.rent_amount += raw.rent_amount;
        bucket.water_amount += raw.water_amount;
        bucket.electricity_amount += raw.electricity_amount;
        break;
      case E_FINANCE_TYPE.rent:
        bucket.rent_amount += raw.amount;
        break;
      case E_FINANCE_TYPE.utilities:
        bucket.electricity_amount += raw.amount;
        break;
    }
  }

  private async syncFinanceDailyReport(storeId: string, recordDate: string) {
    const date = this.normalizeFinanceDate(recordDate);
    const records = await this.prisma.store_finance_record.findMany({
      where: { store_id: storeId, record_date: date },
    });

    const bucket = {
      revenue: 0,
      ingredient_cost: 0,
      rent_amount: 0,
      water_amount: 0,
      electricity_amount: 0,
    };

    records.forEach((raw) =>
      this.accumFromRawRecord(bucket, raw as unknown as RawRecord),
    );

    const hasData =
      bucket.revenue > 0 ||
      bucket.ingredient_cost > 0 ||
      bucket.rent_amount > 0 ||
      bucket.water_amount > 0 ||
      bucket.electricity_amount > 0;

    if (!hasData) {
      await this.prisma.report_store_finance_daily.deleteMany({
        where: { store_id: storeId, record_date: date },
      });
      return;
    }

    await this.prisma.report_store_finance_daily.upsert({
      where: {
        store_id_record_date: { store_id: storeId, record_date: date },
      },
      create: {
        store_id: storeId,
        record_date: date,
        ...bucket,
      },
      update: {
        ...bucket,
        update_date: new Date(),
      },
    });
  }

  private dailyRowExpenseCents(row: {
    ingredient_cost: number;
    rent_amount: number;
    water_amount: number;
    electricity_amount: number;
  }) {
    return (
      row.ingredient_cost +
      row.rent_amount +
      row.water_amount +
      row.electricity_amount
    );
  }

  private buildYearlyCalendarFromDaily(
    rows: {
      record_date: string;
      revenue: number;
      ingredient_cost: number;
      rent_amount: number;
      water_amount: number;
      electricity_amount: number;
    }[],
    year: number,
  ) {
    const monthMap = new Map<string, { revenue: number; expense: number }>();

    rows.forEach((row) => {
      const monthKey = row.record_date.slice(0, 7);
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { revenue: 0, expense: 0 });
      }
      const bucket = monthMap.get(monthKey)!;
      bucket.revenue += this.toYuan(row.revenue);
      bucket.expense += this.toYuan(this.dailyRowExpenseCents(row));
    });

    const round = (n: number) => Number(n.toFixed(2));
    const months = [];

    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, '0')}`;
      const data = monthMap.get(key) || { revenue: 0, expense: 0 };
      const revenue = round(data.revenue);
      const expense = round(data.expense);
      months.push({
        month: m,
        month_label: `${m}月`,
        revenue,
        expense,
        profit: round(revenue - expense),
        has_data: revenue > 0 || expense > 0,
      });
    }

    return { months };
  }

  private buildMonthlyCalendarFromDaily(
    rows: {
      record_date: string;
      revenue: number;
      ingredient_cost: number;
      rent_amount: number;
      water_amount: number;
      electricity_amount: number;
    }[],
    year: number,
    month: number,
  ) {
    const monthStr = String(month).padStart(2, '0');
    const dayMap = new Map<string, { revenue: number; expense: number }>();

    rows.forEach((row) => {
      dayMap.set(row.record_date, {
        revenue: this.toYuan(row.revenue),
        expense: this.toYuan(this.dailyRowExpenseCents(row)),
      });
    });

    const round = (n: number) => Number(n.toFixed(2));
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
      const data = dayMap.get(date) || { revenue: 0, expense: 0 };
      const revenue = round(data.revenue);
      const expense = round(data.expense);
      days.push({
        date,
        day: d,
        revenue,
        expense,
        profit: round(revenue - expense),
        has_data: revenue > 0 || expense > 0,
      });
    }

    return {
      days_in_month: daysInMonth,
      start_weekday: new Date(year, month - 1, 1).getDay(),
      days,
    };
  }

  /** 某日财务明细（盈亏日历弹窗） */
  async getDayDetail(storeId: string, recordDate: string) {
    const date = this.normalizeFinanceDate(recordDate);
    const records = await this.prisma.store_finance_record.findMany({
      where: { store_id: storeId, record_date: date },
      orderBy: [{ create_date: 'asc' }],
    });

    const items: {
      record_id: string;
      type: string;
      kind: 'income' | 'expense';
      title: string;
      detail: string;
      amount: number;
    }[] = [];

    let revenueTotal = 0;
    let expenseTotal = 0;
    const round = (n: number) => Number(n.toFixed(2));

    records.forEach((raw) => {
      const item = this.formatRecord(raw as unknown as RawRecord);
      switch (item.type) {
        case E_FINANCE_TYPE.daily_revenue: {
          revenueTotal += item.total;
          const parts: string[] = [];
          if (item.alipay) parts.push(`支付宝 ￥${item.alipay}`);
          if (item.wechat) parts.push(`微信 ￥${item.wechat}`);
          if (item.cash) parts.push(`现金 ￥${item.cash}`);
          items.push({
            record_id: item.record_id,
            type: item.type,
            kind: 'income',
            title: '营业额',
            detail: parts.join(' · '),
            amount: item.total,
          });
          break;
        }
        case E_FINANCE_TYPE.ingredient_cost:
          expenseTotal += item.amount;
          items.push({
            record_id: item.record_id,
            type: item.type,
            kind: 'expense',
            title: item.item_name || '食材',
            detail: '食材成本',
            amount: item.amount,
          });
          break;
        case E_FINANCE_TYPE.monthly_overhead: {
          const overheadTotal =
            item.rent_amount + item.water_amount + item.electricity_amount;
          expenseTotal += overheadTotal;
          const parts: string[] = [];
          if (item.rent_amount) parts.push(`房租 ￥${item.rent_amount}`);
          if (item.water_amount) parts.push(`水费 ￥${item.water_amount}`);
          if (item.electricity_amount) {
            parts.push(`电费 ￥${item.electricity_amount}`);
          }
          items.push({
            record_id: item.record_id,
            type: item.type,
            kind: 'expense',
            title: '房租与水电',
            detail: parts.join(' · '),
            amount: overheadTotal,
          });
          break;
        }
        case E_FINANCE_TYPE.rent:
          expenseTotal += item.amount;
          items.push({
            record_id: item.record_id,
            type: item.type,
            kind: 'expense',
            title: '房租',
            detail: '',
            amount: item.amount,
          });
          break;
        case E_FINANCE_TYPE.utilities:
          expenseTotal += item.amount;
          items.push({
            record_id: item.record_id,
            type: item.type,
            kind: 'expense',
            title: '水电',
            detail: '',
            amount: item.amount,
          });
          break;
      }
    });

    return {
      date,
      revenue_total: round(revenueTotal),
      expense_total: round(expenseTotal),
      items,
    };
  }
}
