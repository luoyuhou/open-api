import { Module } from '@nestjs/common';
import { HomeBannerService } from './home-banner.service';
import { HomeBannerController } from './home-banner.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HomeBannerController],
  providers: [HomeBannerService],
})
export class HomeBannerModule {}
