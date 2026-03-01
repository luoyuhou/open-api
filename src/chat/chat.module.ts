import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../common/cache-manager/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
