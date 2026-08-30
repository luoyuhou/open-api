import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SchedulesService } from './schedules.service';

@UseGuards(SessionAuthGuard)
@Controller('schedules')
@ApiTags('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOkResponse({ description: '列出当前进程内已注册的 Cron 任务' })
  list() {
    return this.schedulesService.listCronJobs();
  }
}
