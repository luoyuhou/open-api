import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { PublisherController } from './publisher.controller';
import { PublisherCron } from './publisher.cron';
import { PublisherMediaService } from './publisher-media.service';
import { PublisherService } from './publisher.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [FileModule],
  controllers: [PublisherController],
  providers: [
    PublisherService,
    PublisherMediaService,
    PublisherCron,
    PrismaService,
  ],
  exports: [PublisherService],
})
export class PublisherModule {}
