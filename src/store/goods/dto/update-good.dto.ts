import { CreateGoodDto } from './create-good.dto';
import { PartialType, PickType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateGoodDto extends PartialType(
  PickType(CreateGoodDto, ['name', 'description']),
) {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty()
  category_ids?: string[];

  @IsOptional()
  @IsString()
  @ApiProperty()
  name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  description?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty()
  price?: number;

  @IsOptional()
  @IsString()
  @ApiProperty()
  unit_name?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty()
  status?: number;
}
