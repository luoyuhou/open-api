import { Module } from '@nestjs/common';
import { StoreResourceController } from './store-resource.controller';
import { StoreResourceService } from './store-resource.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StoreResourceController],
  providers: [StoreResourceService],
  exports: [StoreResourceService],
})
export class StoreResourceModule {}
