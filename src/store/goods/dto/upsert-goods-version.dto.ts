import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateGoodsVersionDto } from './create-goods-version.dto';
import { Transform } from 'class-transformer';

export class UpsertGoodsVersionDto extends CreateGoodsVersionDto {
  @IsInt()
  @ApiProperty()
  @IsEnum([0, 1])
  @Transform(({ value }) => parseInt(value, 10))
  status: number;

  @IsString()
  @IsOptional()
  @ApiProperty()
  version_id: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  @Transform(({ value }) => value === 'true' || value === true)
  remove_image?: boolean;

  // 重写父类的数字字段，添加 Transform
  @IsInt()
  @ApiProperty()
  @Transform(({ value }) => parseInt(value, 10))
  count: number;

  @IsInt()
  @ApiProperty()
  @Transform(({ value }) => parseInt(value, 10))
  price: number;

  @IsString()
  @ApiProperty()
  @IsOptional()
  @Transform(({ value }) => String(value ?? ''))
  version_number: string;
}
