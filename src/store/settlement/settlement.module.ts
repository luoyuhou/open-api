import { Module } from '@nestjs/common';
import { StoreSettlementService } from './store-settlement.service';
import { PlatformSettlementService } from './platform-settlement.service';
import { SettlementController } from './settlement.controller';
import { SettlementCronService } from './settlement.cron';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SettlementController],
  providers: [
    StoreSettlementService,
    PlatformSettlementService,
    SettlementCronService,
  ],
  exports: [StoreSettlementService, PlatformSettlementService],
})
export class SettlementModule {}
