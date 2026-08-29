import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RefundMemberBalanceDto {
  @ApiProperty({
    description: '退费金额（元），从会员账户余额扣减',
    example: 50,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: '是否清空会员积分，默认 false',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  clear_points?: boolean;
}
