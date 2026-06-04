import {
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class SyncOrderItemDetailDto {
  @IsString()
  @ApiProperty({ description: '商品ID' })
  goods_id: string;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOrderItemDetailDto)
  @ApiProperty({ type: [SyncOrderItemDetailDto], description: '商品详情' })
  items: SyncOrderItemDetailDto[];
}

export class CashierSyncPushDto {
  @IsString()
  @ApiProperty({ description: '店铺ID' })
  store_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOrderDto)
  @ApiProperty({ type: [SyncOrderDto], description: '待同步订单列表' })
  orders: SyncOrderDto[];
}
