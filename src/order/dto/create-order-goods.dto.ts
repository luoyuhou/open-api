import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderGoodsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  goods_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  goods_name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  goods_version_id: string;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @ApiProperty()
  count: number;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @ApiProperty()
  price: number;
}
