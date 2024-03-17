import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertRoleForRoleManagementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  @ApiProperty()
  role_name: string;

  @IsString()
  @MaxLength(1024)
  @IsOptional()
  @ApiProperty()
  description: string;
}
