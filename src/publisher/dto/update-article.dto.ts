import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @ApiPropertyOptional()
  title?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  @ApiPropertyOptional()
  digest?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  cover?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ enum: ['draft', 'publishing', 'published'] })
  status?: string;
}
