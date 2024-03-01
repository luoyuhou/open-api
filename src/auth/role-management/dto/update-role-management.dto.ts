import { PartialType } from '@nestjs/swagger';
import { CreateRoleManagementDto } from './create-role-management.dto';

export class UpdateRoleManagementDto extends PartialType(
  CreateRoleManagementDto,
) {}
