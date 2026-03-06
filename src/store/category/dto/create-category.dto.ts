import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryGoods } from '../entities/category.entity';
import { PickType } from '@nestjs/mapped-types';

export class CreateCategoryDto extends PickType(CategoryGoods, [
  'store_id',
  'name',
  'pid',
]) {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  store_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  pid: string;
}
