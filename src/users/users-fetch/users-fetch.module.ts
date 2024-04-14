import { Module } from '@nestjs/common';
import { UsersFetchService } from './users-fetch.service';
import { UsersFetchController } from './users-fetch.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersFetchController],
  providers: [UsersFetchService],
  exports: [UsersFetchService],
})
export class UsersFetchModule {}
