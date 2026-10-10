import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAlqqCredentialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @ApiProperty({ description: '账号名称，用于区分多个 ALQQ 账号' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({ description: '用户在 ALQQ 后台生成的 API Key' })
  apiKey: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: '是否设为当前使用账号' })
  isDefault?: boolean;
}

export class UpdateAlqqCredentialDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @ApiPropertyOptional({ description: '账号名称' })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @ApiPropertyOptional({ description: '替换 API Key' })
  apiKey?: string;
}
