import { Module } from '@nestjs/common';
import { HomeBannerService } from './home-banner.service';
import { HomeBannerController } from './home-banner.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FileModule } from '../file/file.module';

@Module({
  imports: [PrismaModule, FileModule],
  controllers: [HomeBannerController],
  providers: [HomeBannerService],
})
export class HomeBannerModule {}
