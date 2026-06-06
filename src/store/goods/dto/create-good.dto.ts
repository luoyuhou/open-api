import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGoodDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  store_id: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty()
  category_ids?: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  @ApiProperty()
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  description?: string;
}
