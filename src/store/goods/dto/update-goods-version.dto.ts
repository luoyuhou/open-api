import { IsEnum, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PickType } from '@nestjs/mapped-types';
import { CreateGoodsVersionDto } from './create-goods-version.dto';
import { E_GOODS_VERSION_STATUS } from '../const';

export class UpdateGoodsVersionDto extends PickType(CreateGoodsVersionDto, [
  'version_number',
  'bar_code',
  'count',
  'price',
  'unit_name',
  'supplier',
]) {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  goods_id: string;

  @ApiProperty()
  version_number: string;

  @ApiProperty()
  bar_code: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  unit_name: string;

  @ApiProperty()
  supplier: string;

  @IsInt()
  @IsNotEmpty()
  @IsEnum(Object.values(E_GOODS_VERSION_STATUS))
  @ApiProperty()
  status: number;
}
