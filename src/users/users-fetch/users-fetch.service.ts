import { Injectable } from '@nestjs/common';
import { UpdateUsersFetchDto } from './dto/update-users-fetch.dto';
import { PrismaService } from '../../prisma/prisma.service';
import * as moment from 'moment';
import customLogger from '../../common/logger';
import { Pagination } from '../../common/dto/pagination';

@Injectable()
export class UsersFetchService {
  constructor(private prisma: PrismaService) {}

  public async realtime(user_id: string) {
    const now = moment();
    const start = moment().startOf('day').toDate();
    return this.prisma.user_fetch.groupBy({
      where: { user_id, create_date: { gte: start, lte: now.toDate() } },
      by: ['source'],
      _count: true,
    });
  }

  public async fetchPagination({
    pageNum,
    pageSize,
    sorted,
    filtered,
  }: Pagination) {
    const where = {};
    filtered.forEach(({ id, value }) => {
      if (Array.isArray(value)) {
        where[id] = { in: value };
        return;
      }

      where[id] = value;
    });

    const orderByKey =
      Array.isArray(sorted) && sorted.length ? sorted[0].id : 'create_date';
    const orderByValue =
      Array.isArray(sorted) && sorted.length
        ? sorted[0].desc
          ? 'desc'
          : 'acs'
        : 'desc';
    const count = await this.prisma.report_daily_user_fetch.count({
      where: where,
    });
    const data = await this.prisma.report_daily_user_fetch.findMany({
      where: where,
      take: pageSize,
      skip: pageNum * pageSize,
      orderBy: { [orderByKey]: orderByValue },
    });

    return {
      data,
      rows: count,
      pages: Math.ceil(count / pageSize),
    };
  }

  public async loginPagination({
    pageNum,
    pageSize,
    sorted,
    filtered,
  }: Pagination) {
    const where = {};
    filtered.forEach(({ id, value }) => {
      if (Array.isArray(value)) {
        where[id] = { in: value };
        return;
      }

      where[id] = value;
    });

    const orderByKey =
      Array.isArray(sorted) && sorted.length ? sorted[0].id : 'create_date';
    const orderByValue =
      Array.isArray(sorted) && sorted.length
        ? sorted[0].desc
          ? 'desc'
          : 'acs'
        : 'desc';
    const count = await this.prisma.user_signin_history.count({
      where: where,
    });
    const data = await this.prisma.user_signin_history.findMany({
      where: where,
      take: pageSize,
      skip: pageNum * pageSize,
      orderBy: { [orderByKey]: orderByValue },
    });

    return {
      data,
      rows: count,
      pages: Math.ceil(count / pageSize),
    };
  }

  findAll() {
    return `This action returns all usersFetch`;
  }

  findOne(id: number) {
    return `This action returns a #${id} usersFetch`;
  }

  update(id: number, updateUsersFetchDto: UpdateUsersFetchDto) {
    return `This action updates a #${id} usersFetch`;
  }

  remove(id: number) {
    return `This action removes a #${id} usersFetch`;
  }

  public async upsertUserDailyFetch(data: {
    user_id: string;
    record_date: Date;
    times: number;
    use_time: number;
  }) {
    const find = await this.prisma.report_daily_user_fetch.findFirst({
      where: { user_id: data.user_id, record_date: data.record_date },
    });

    if (find) {
      // update
      return this.prisma.report_daily_user_fetch.update({
        data,
        where: { id: find.id },
      });
    }

    // insert
    return this.prisma.report_daily_user_fetch.create({ data });
  }

  async getUseSecondsByUserId(user_id: string, start: string, end: string) {
    const data = await this.prisma.$queryRawUnsafe<
      { max_date: Date; min_date: Date }[]
    >(`
    SELECT MAX(create_date) AS max_date, MIN(create_date) AS min_date
    FROM storehouse.user_fetch
    WHERE user_id = '${user_id}'
    AND create_date >= '${start}' and create_date <= '${end}'
    `);

    if (!data.length) {
      return 0;
    }

    const { max_date, min_date } = data[0];

    const max_timestamp = +(new Date(max_date).getTime() / 1000).toFixed(0);
    const min_timestamp = +(new Date(min_date).getTime() / 1000).toFixed(0);

    return max_timestamp - min_timestamp || 0;
  }

  async dailyUsersFetch() {
    const date = moment().subtract(1, 'days');
    const start = moment(date).startOf('day');
    const end = moment(date).endOf('day');

    const formatStart = start.format('YYYY-MM-DD HH:mm:ss');
    const formatEnd = end.format('YYYY-MM-DD HH:mm:ss');

    const log = {
      title: 'Generate daily report for users-fetch',
      func: 'dailyUsersFetch',
      start: formatStart,
      end: formatEnd,
    };
    const steps = 5;
    customLogger.log({ ...log, message: 'start schedule', step: `1/${steps}` });

    const groupBy = await this.prisma.user_fetch.groupBy({
      where: { create_date: { gte: start.toDate(), lte: end.toDate() } },
      by: ['user_id'],
      _count: true,
    });

    customLogger.log({
      ...log,
      message: 'start schedule',
      data: JSON.stringify(groupBy),
      step: `2/${steps}`,
    });

    const recordDate = start.add(1, 'hours').toDate();
    const failedUserIds: string[] = [];

    for (let i = 0; i < groupBy.length; i++) {
      const { user_id, _count } = groupBy[i];
      customLogger.log({
        ...log,
        message: 'start item',
        data: { user_id, count: _count },
        step: `3/${steps}`,
      });

      try {
        const seconds = await this.getUseSecondsByUserId(
          user_id,
          formatStart,
          formatEnd,
        );

        await this.upsertUserDailyFetch({
          user_id,
          times: _count,
          use_time: seconds,
          record_date: recordDate,
        });
        customLogger.log({
          ...log,
          message: 'finished item',
          data: { user_id, count: _count },
          step: `4/${steps}`,
        });
      } catch (err) {
        failedUserIds.push(user_id);
        customLogger.error({
          ...log,
          message: 'finished item',
          data: { user_id, count: _count },
          error: err.message,
          step: `4/${steps}`,
        });
      }
    }

    customLogger.log({
      ...log,
      message: 'finished schedule',
      data: { count: groupBy.length, failed: failedUserIds },
      step: `${steps}/${steps}`,
    });
  }
}
