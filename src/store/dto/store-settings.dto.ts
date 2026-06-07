import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsArray, IsInt, Min, Max } from 'class-validator';

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
}
