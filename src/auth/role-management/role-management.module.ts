import { Module } from '@nestjs/common';
import { RoleManagementService } from './role-management.service';
import { RoleManagementController } from './role-management.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RoleManagementController],
  providers: [RoleManagementService],
})
export class RoleManagementModule {}
