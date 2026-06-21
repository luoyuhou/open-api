import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { UpsertFinanceRecordDto } from './dto/upsert-finance-record.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { E_FINANCE_TYPE } from './const';

@UseGuards(SessionAuthGuard)
@Controller('store/finance')
@ApiTags('store/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get(':storeId/summary')
  @ApiOperation({ summary: '盈亏汇总（营业额 − 成本 − 固定开销）' })
  summary(
    @Param('storeId') storeId: string,
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.financeService.getProfitLossSummary(
      storeId,
      Number(year),
      month ? Number(month) : undefined,
    );
  }

  @Get(':storeId/day/:date')
  @ApiOperation({ summary: '获取某日财务明细' })
  dayDetail(@Param('storeId') storeId: string, @Param('date') date: string) {
    return this.financeService.getDayDetail(storeId, date);
  }

  @Get(':storeId/list')
  @ApiOperation({ summary: '获取店铺财务记录' })
  list(
    @Param('storeId') storeId: string,
    @Query('type') type: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    if (!Object.values(E_FINANCE_TYPE).includes(type as any)) {
      return {
        items: [],
        summary: { alipay: 0, wechat: 0, cash: 0, total: 0 },
      };
    }
    return this.financeService.list(
      storeId,
      type as any,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }

  @Post()
  @ApiOperation({ summary: '新增或更新财务记录' })
  upsert(@Body() dto: UpsertFinanceRecordDto) {
    return this.financeService.upsert(dto);
  }

  @Delete(':recordId')
  @ApiOperation({ summary: '删除财务记录' })
  remove(@Param('recordId') recordId: string) {
    return this.financeService.remove(recordId);
  }
}
