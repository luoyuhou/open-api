import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { UsersFetchModule } from '../users/users-fetch/users-fetch.module';

@Module({
  imports: [UsersFetchModule],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
