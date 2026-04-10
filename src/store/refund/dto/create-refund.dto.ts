import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsArray, Min } from 'class-validator';

export class CreateRefundDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '退款金额（分）', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  money?: number;

  @ApiProperty({ description: '退款原因' })
  @IsString()
  reason: string;

  @ApiProperty({ description: '用户备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '凭证图片URL数组', required: false })
  @IsOptional()
  @IsArray()
  images?: string[];
}
