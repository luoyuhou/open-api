import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '商品ID' })
  @IsString()
  goodsId: string;

  @ApiProperty({ description: '评分 1-5星' })
  @IsInt()
  @Min(1)
  @Max(5)
  star: number;

  @ApiProperty({ description: '评价内容', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: '评价图片URL数组', required: false })
  @IsOptional()
  @IsArray()
  images?: string[];
}
