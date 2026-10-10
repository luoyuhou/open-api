import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PublisherMediaService } from './publisher-media.service';
import { PublisherService } from './publisher.service';

@Injectable()
export class PublisherCron {
  constructor(
    private readonly publisherService: PublisherService,
    private readonly publisherMediaService: PublisherMediaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'publisher-scheduled-jobs' })
  async tick() {
    await this.publisherService.executeDueScheduledJobs();
    await this.publisherService.syncRunningPublishJobs();
  }

  @Cron(CronExpression.EVERY_HOUR, { name: 'publisher-media-hourly' })
  async cleanupHourly() {
    await this.publisherMediaService.cleanupOrphanUploads();
    await this.publisherMediaService.cleanupPublishedAssets();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'publisher-media-cleanup' })
  async cleanupMedia() {
    await this.publisherMediaService.runDailyCleanup();
  }
}
