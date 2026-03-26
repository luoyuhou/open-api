import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { StoreSettlementService } from './store-settlement.service';
import { PlatformSettlementService } from './platform-settlement.service';
import customLogger from '../../common/logger';

@Injectable()
export class SettlementCronService {
  constructor(
    private readonly storeSettlementService: StoreSettlementService,
    private readonly platformSettlementService: PlatformSettlementService,
  ) {}

  // 每月1号凌晨3点生成上个月的商家结算
  @Cron('0 3 1 * *')
  async generateStoreMonthlySettlement() {
    customLogger.log({ message: '开始生成商家月度结算' });

    try {
      const result =
        await this.storeSettlementService.generateMonthlySettlement();
      customLogger.log({
        message: `商家月度结算生成完成`,
        data: { count: result.length },
      });
    } catch (error) {
      customLogger.error({ message: '商家月度结算生成失败', error });
    }
  }

  // 每月1号凌晨4点生成上个月的平台结算
  @Cron('0 4 1 * *')
  async generatePlatformMonthlySettlement() {
    customLogger.log({ message: '开始生成平台月度结算' });

    try {
      const result =
        await this.platformSettlementService.generateMonthlySettlement();
      customLogger.log({
        message: `平台月度结算生成完成`,
        data: result,
      });
    } catch (error) {
      customLogger.error({ message: '平台月度结算生成失败', error });
    }
  }
}
