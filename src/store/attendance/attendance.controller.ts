import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { UserEntity } from '../../users/entities/user.entity';
import { AttendanceService } from './attendance.service';
import { PunchDto } from './dto/punch.dto';
import { AdjustAttendanceDto } from './dto/adjust-attendance.dto';

@UseGuards(SessionAuthGuard)
@Controller('store/attendance')
@ApiTags('store/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('mine/today')
  @ApiOperation({ summary: '我的今日考勤状态' })
  mineToday(
    @Query('storeId') storeId: string,
    @Req() req: { user: UserEntity },
  ) {
    return this.attendanceService.getMineToday(storeId, req.user);
  }

  @Post('punch')
  @ApiOperation({ summary: '上班/下班打卡' })
  punch(@Body() dto: PunchDto, @Req() req: { user: UserEntity }) {
    return this.attendanceService.punch(req.user, dto);
  }

  @Get('list')
  @ApiOperation({ summary: '店主查看打卡记录' })
  list(
    @Query('storeId') storeId: string,
    @Query('date') date: string,
    @Query('staffId') staffId: string,
    @Req() req: { user: UserEntity },
  ) {
    return this.attendanceService.list(storeId, req.user, {
      date,
      staffId,
    });
  }

  @Post('adjust')
  @ApiOperation({ summary: '店主补卡' })
  adjust(@Body() dto: AdjustAttendanceDto, @Req() req: { user: UserEntity }) {
    return this.attendanceService.adjust(req.user, dto);
  }
}
