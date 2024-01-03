import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGoodsVersionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  goods_id: string;

  @IsString()
  @ApiProperty()
  @MaxLength(32)
  version_number: string;

  @IsString()
  @ApiProperty()
  @MaxLength(32)
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
  @MaxLength(64)
  @ApiProperty()
  supplier: string;
}
