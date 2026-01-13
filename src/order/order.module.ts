import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatGateway } from '../chat/chat.gateway';
import { CacheModule } from '../common/cache-manager/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  providers: [OrderService, ChatGateway],
  exports: [OrderService],
})
export class OrderModule {}
