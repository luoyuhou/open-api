import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { E_FINANCE_TYPE } from '../const';

export class UpsertFinanceRecordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  store_id: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(E_FINANCE_TYPE))
  @ApiProperty()
  type: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @ApiProperty({ description: 'YYYY-MM-DD，月度记录用当月1号' })
  record_date: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false })
  alipay?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false })
  wechat?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false })
  cash?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false })
  amount?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  remark?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, description: '食材名称等明细项' })
  item_name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, description: '更新已有记录时传入' })
  record_id?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false, description: '月房租(元)' })
  rent_amount?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false, description: '用水量(立方)' })
  water_volume?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false, description: '水费(元)' })
  water_amount?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false, description: '用电量(度)' })
  electricity_kwh?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false, description: '电费(元)' })
  electricity_amount?: number;
}
