import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { FileModule } from '../file/file.module';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [PrismaModule, FileModule, PlatformModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
