import { CreateAuthForRoleManagementDto } from './create-auth-for-role-management.dto';
import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAuthForRoleManagementDto extends CreateAuthForRoleManagementDto {
  @IsNotEmpty()
  @IsInt()
  @ApiProperty()
  status: number;
}
