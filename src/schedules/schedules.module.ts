import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { UsersFetchModule } from '../users/users-fetch/users-fetch.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StoreServiceBillingCronService } from './store-service-billing.cron';
import { StoreOrderDailyReportCronService } from './store-order-daily-report.cron';
import { OnlineUserSnapshotCronService } from './online-user-snapshot.cron';

@Module({
  imports: [UsersFetchModule, PrismaModule],
  controllers: [SchedulesController],
  providers: [
    SchedulesService,
    StoreServiceBillingCronService,
    StoreOrderDailyReportCronService,
    OnlineUserSnapshotCronService,
  ],
  exports: [SchedulesService],
})
export class SchedulesModule {}
