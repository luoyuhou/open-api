import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchHistoryDto {
  @IsString()
  @IsOptional()
  @IsEnum(['apply'])
  @ApiProperty()
  type: string;
}
