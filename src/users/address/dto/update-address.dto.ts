import { ApiProperty } from '@nestjs/swagger';
import { CreateAddressDto } from './create-address.dto';
import { PickType } from '@nestjs/mapped-types';

export class UpdateAddressDto extends PickType(CreateAddressDto, [
  'recipient',
  'phone',
  'province',
  'city',
  'area',
  'address',
  'is_default',
  'tag',
]) {
  @ApiProperty()
  recipient: string;

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

  @ApiProperty()
  is_default: boolean;

  @ApiProperty()
  tag: string;
}
