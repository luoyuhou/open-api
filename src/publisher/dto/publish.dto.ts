import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class PublishArticleDto {
  @IsString()
  @ApiProperty()
  articleId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @ApiProperty({ type: [String] })
  platformIds: string[];

  @IsOptional()
  @IsEnum(['publish', 'schedule'])
  @ApiPropertyOptional({ enum: ['publish', 'schedule'], default: 'publish' })
  mode?: 'publish' | 'schedule';

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  @ApiPropertyOptional({ description: '当天预约时分，如 21:30' })
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: '使用的 ALQQ 账号 ID，不传则用当前默认账号',
  })
  credentialId?: string;
}
