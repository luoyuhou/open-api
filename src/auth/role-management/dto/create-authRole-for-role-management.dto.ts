import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAuthRoleForRoleManagementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @ApiProperty()
  auth_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @ApiProperty()
  role_id: string;
}
