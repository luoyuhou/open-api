import { CreateStoreDto } from './create-store.dto';
import { PickType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateStoreDto extends PickType(CreateStoreDto, [
  'user_id',
  'store_name',
  'id_name',
  'id_code',
  'user_id',
  'phone',
  'province',
  'city',
  'area',
  'address',
]) {
  @ApiProperty()
  user_id: string;

  @ApiProperty()
  store_name: string;

  @ApiProperty()
  id_name: string;

  @ApiProperty()
  id_code: string;

  @ApiProperty({ required: false, description: '微信收款码 URL' })
  @IsString()
  @MaxLength(256)
  wechat_qr_url?: string;

  @ApiProperty({ required: false, description: '支付宝收款码 URL' })
  @IsString()
  @MaxLength(256)
  alipay_qr_url?: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  province: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  area: string;

  @ApiProperty()
  address: string;
}
