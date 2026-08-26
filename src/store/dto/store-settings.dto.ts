import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsArray,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class UpdateStoreSettingsDto {
  @ApiProperty({ description: '每元消费可得积分' })
  @IsNumber()
  @Min(0)
  pointsPerYuan: number;

  @ApiProperty({ description: '积分抵扣比例（多少积分抵扣1元）' })
  @IsNumber()
  @Min(1)
  pointsRedemptionRatio: number;

  @ApiProperty({ description: '允许积分抵扣的日期（1-31）', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(31, { each: true })
  redemptionDays: number[];

  @ApiProperty({
    description: '会员默认折扣（折），10为不打折，如8.5表示八五折',
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  memberDiscountRate?: number;
}
