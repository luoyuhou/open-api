import { Module } from '@nestjs/common';
import { RoleManagementService } from './role-management.service';
import { RoleManagementController } from './role-management.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheService } from '../../common/cache-manager/cache.service';

@Module({
  imports: [PrismaModule],
  controllers: [RoleManagementController],
  providers: [RoleManagementService, CacheService],
  exports: [RoleManagementService],
})
export class RoleManagementModule {}
