import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../common/cache-manager/cache.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [PrismaModule, CacheModule, ChatModule],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
