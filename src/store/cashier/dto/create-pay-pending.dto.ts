import {
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PendingOrderItemDto {
  @IsString()
  @ApiProperty()
  goods_id: string;

  @IsString()
  @ApiProperty()
  name: string;

  @IsString()
  @ApiProperty()
  version_id: string;

  @IsNumber()
  @ApiProperty({ description: '数量（计重为克）' })
  count: number;

  @IsNumber()
  @ApiProperty({ description: '成交单价（分）' })
  price: number;
}

export class CreatePayPendingDto {
  @IsString()
  @ApiProperty()
  store_id: string;

  @IsNumber()
  @ApiProperty({ description: '原价合计（分）' })
  total_amount: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: '折扣率（85=8.5折，100=不打折）',
    required: false,
  })
  discount_rate?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PendingOrderItemDto)
  @ApiProperty({ type: [PendingOrderItemDto] })
  items: PendingOrderItemDto[];
}
