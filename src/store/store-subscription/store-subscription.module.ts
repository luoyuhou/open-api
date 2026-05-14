import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StoreSubscriptionService } from './store-subscription.service';
import { StoreServiceController } from './store-subscription.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StoreServiceController],
  providers: [StoreSubscriptionService],
  exports: [StoreSubscriptionService],
})
export class StoreSubscriptionModule {}
