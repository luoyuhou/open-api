import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersFetchService } from '../users/users-fetch/users-fetch.service';
import customLogger from '../common/logger';

@Injectable()
export class SchedulesService {
  constructor(private readonly usersFetchService: UsersFetchService) {}

  // 每 1minus 执行一次
  @Cron(CronExpression.EVERY_MINUTE)
  handleCron() {
    customLogger.log({ message: '执行定时任务' });
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  reportUserDailyFetch() {
    this.usersFetchService.dailyUsersFetch();
  }
}
