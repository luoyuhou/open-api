import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePublishPlatformDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @ApiPropertyOptional()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @ApiPropertyOptional()
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  @ApiPropertyOptional()
  loginUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  @ApiPropertyOptional()
  hint?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional()
  sort?: number;
}
