import { Module } from '@nestjs/common';
import { GoodsService } from './goods.service';
import { GoodsController } from './goods.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { FileModule } from '../../file/file.module';

@Module({
  imports: [PrismaModule, FileModule],
  controllers: [GoodsController],
  providers: [GoodsService],
  exports: [GoodsService],
})
export class GoodsModule {}
