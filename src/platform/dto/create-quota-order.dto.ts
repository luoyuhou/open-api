import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MEMBER_QUOTA_OPTIONS, PLATFORM_ORDER_TYPE } from '../platform.const';

export class CreateQuotaOrderDto {
  @ApiProperty({
    enum: [PLATFORM_ORDER_TYPE.STORE_CREATE, PLATFORM_ORDER_TYPE.MEMBER_QUOTA],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn([PLATFORM_ORDER_TYPE.STORE_CREATE, PLATFORM_ORDER_TYPE.MEMBER_QUOTA])
  order_type: string;

  @ApiProperty({ required: false, description: '会员扩容时必填' })
  @IsOptional()
  @IsString()
  store_id?: string;

  @ApiProperty({ required: false, enum: MEMBER_QUOTA_OPTIONS })
  @IsOptional()
  @IsIn(MEMBER_QUOTA_OPTIONS as unknown as number[])
  quota_amount?: number;
}
