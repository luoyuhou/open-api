import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAuthForRoleManagementDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @ApiProperty()
  pid: string;

  @IsNotEmpty()
  @IsInt()
  @ApiProperty()
  side: number;

  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  @ApiProperty()
  path: string;

  @IsString()
  @IsOptional()
  @MaxLength(8)
  @ApiProperty()
  method: string;
}
