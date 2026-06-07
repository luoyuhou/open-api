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

class StoreOrderItemDetailDto {
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

class SyncOrderDto {
  @IsString()
  @ApiProperty({ description: '本地生成的订单ID/流水号' })
  local_id: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '会员ID', required: false })
  member_id?: string;

  @IsNumber()
  @ApiProperty({ description: '总金额（分）' })
  total_amount: number;

  @IsString()
  @ApiProperty({ description: '下单时间' })
  created_at: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '支付方式 (cash, balance)', required: false })
  payment_method?: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: '扣除积分', required: false })
  points_used?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: '获得积分', required: false })
  earn_points?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: '实际支付金额（分）', required: false })
  payable_amount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreOrderItemDetailDto)
  @ApiProperty({ type: [StoreOrderItemDetailDto], description: '商品详情' })
  items: StoreOrderItemDetailDto[];
}

export class CashierOrderDto {
  @IsString()
  @ApiProperty({ description: '店铺ID' })
  store_id: string;

  @IsObject()
  @Type(() => SyncOrderDto)
  @ApiProperty({ type: SyncOrderDto, description: '待同步订单列表' })
  order: SyncOrderDto;
}
