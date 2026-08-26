import {
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PendingOrderItemDto {
  @IsString()
  @ApiProperty({ description: '商品ID' })
  goods_id: string;

  @IsString()
  @ApiProperty({ description: '商品名' })
  name: string;

  @IsString()
  @ApiProperty({ description: '规格版本ID' })
  version_id: string;

  @IsNumber()
  @ApiProperty({ description: '数量' })
  count: number;

  @IsNumber()
  @ApiProperty({ description: '成交价格（分）' })
  price: number;
}

export class PendingOrderPayloadDto {
  @IsString()
  @ApiProperty({ description: '本地流水号' })
  local_id: string;

  @IsNumber()
  @ApiProperty({ description: '总金额（分）' })
  total_amount: number;

  @IsString()
  @ApiProperty({ description: '下单时间' })
  created_at: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: '折扣率（百分比×10，如85表示8.5折，100表示无折扣）',
    required: false,
  })
  discount_rate?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PendingOrderItemDto)
  @ApiProperty({ type: [PendingOrderItemDto], description: '商品详情' })
  items: PendingOrderItemDto[];
}

export class CreatePendingOrderDto {
  @IsString()
  @ApiProperty({ description: '店铺ID' })
  store_id: string;

  @IsObject()
  @Type(() => PendingOrderPayloadDto)
  @ApiProperty({ type: PendingOrderPayloadDto, description: '订单草稿' })
  order: PendingOrderPayloadDto;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '已有待支付单ID（更新草稿）', required: false })
  pending_id?: string;
}

export class UpdatePendingOrderDto {
  @IsString()
  @ApiProperty({ description: '店铺ID' })
  store_id: string;

  @IsObject()
  @Type(() => PendingOrderPayloadDto)
  @ApiProperty({ type: PendingOrderPayloadDto, description: '订单草稿' })
  order: PendingOrderPayloadDto;
}
