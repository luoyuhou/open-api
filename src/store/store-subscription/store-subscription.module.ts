import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StoreModule } from '../store.module';
import { StoreServiceService } from './store-subscription.service';
import { StoreServiceController } from './store-subscription.controller';

@Module({
  imports: [PrismaModule, StoreModule],
  controllers: [StoreServiceController],
  providers: [StoreServiceService],
  exports: [StoreServiceService],
})
export class StoreSubscriptionModule {}
