import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserRoleForRoleManagementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @ApiProperty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @ApiProperty()
  role_id: string;
}
