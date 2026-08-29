import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RefundOrderDto {
  @ApiProperty({ description: '退回会员余额金额（元）', example: 10.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: '是否清理本单积分变动（回退已用、扣回已获），默认 false',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  clear_points?: boolean;
}
