import { IsEnum, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateUserRoleForRoleManagementDto } from './create-userRole-for-role-management.dto';
import { EUSER_ROLE_STATUS } from '../const';

export class UpdateUserRoleForRoleManagementDto extends CreateUserRoleForRoleManagementDto {
  @ApiProperty()
  user_id: string;

  @ApiProperty()
  role_id: string;

  @IsInt()
  @IsEnum(EUSER_ROLE_STATUS)
  @ApiProperty()
  status: number;
}
