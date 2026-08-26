import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PLATFORM_ORDER_TYPE } from '../platform.const';

export class ValidateCodeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    enum: [PLATFORM_ORDER_TYPE.STORE_CREATE, PLATFORM_ORDER_TYPE.MEMBER_QUOTA],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn([PLATFORM_ORDER_TYPE.STORE_CREATE, PLATFORM_ORDER_TYPE.MEMBER_QUOTA])
  code_type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  store_id?: string;
}

export class RedeemMemberQuotaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  store_id: string;
}
