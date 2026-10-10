import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAccountDto {
  @IsBoolean()
  @ApiProperty()
  bound: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @ApiPropertyOptional()
  accountName?: string;
}
