import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';

export class CreateRechargeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  member_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  store_id: string;

  @ApiProperty({ description: '实收金额（分）' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ description: '到账金额（分）' })
  @IsInt()
  @Min(1)
  received_amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cashier_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
