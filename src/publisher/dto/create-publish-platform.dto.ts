import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePublishPlatformDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_-]{1,31}$/)
  @ApiProperty({ example: 'wechat' })
  platformId: string;

  @IsString()
  @MaxLength(64)
  @ApiProperty()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @ApiPropertyOptional({ example: '#07C160' })
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
  @ApiPropertyOptional({ default: true })
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ default: 100 })
  sort?: number;
}
