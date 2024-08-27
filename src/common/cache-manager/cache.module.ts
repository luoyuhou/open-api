import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Module({
  controllers: [],
  providers: [CacheService],
  imports: [],
  exports: [CacheService],
})
export class CacheModule {}
