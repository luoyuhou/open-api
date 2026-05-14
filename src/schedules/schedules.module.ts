import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersFetchModule } from '../users/users-fetch/users-fetch.module';
import { SettlementModule } from '../store/settlement/settlement.module';
import { SchedulesService } from './schedules.service';
import { SettlementCronService } from './settlement.cron';
import { StoreServiceBillingCronService } from './store-service-billing.cron';
import { StoreOrderDailyReportCronService } from './store-order-daily-report.cron';

@Module({
  imports: [PrismaModule, UsersFetchModule, SettlementModule],
  providers: [
    SchedulesService,
    SettlementCronService,
    StoreServiceBillingCronService,
    StoreOrderDailyReportCronService,
  ],
})
export class SchedulesModule {}
