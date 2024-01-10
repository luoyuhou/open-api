import { Module } from '@nestjs/common';
import { GeneralService } from './general.service';
import { GeneralController } from './general.controller';
import { ProvinceModule } from './province/province.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ProvinceModule],
  controllers: [GeneralController],
  providers: [GeneralService],
})
export class GeneralModule {}
