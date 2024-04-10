import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGoodsVersionDto {
  @IsString()
  @ApiProperty()
  @MaxLength(32)
  version_number: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  @ApiProperty()
  bar_code: string;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty()
  count: number;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty()
  price: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @MaxLength(8)
  unit_name: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  @ApiProperty()
  supplier: string;
}
