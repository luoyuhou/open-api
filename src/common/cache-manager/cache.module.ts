import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()
@Module({
  controllers: [],
  providers: [CacheService],
  imports: [],
  exports: [CacheService],
})
export class CacheModule {}
