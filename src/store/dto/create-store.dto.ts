import {
  IsInt,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PickType } from '@nestjs/mapped-types';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  store_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  store_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  id_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  id_code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  user_id: string;

  @IsString()
  @IsPhoneNumber('CN')
  @IsNotEmpty()
  @MaxLength(11)
  @ApiProperty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  province: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  area: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  town: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  address: string;

  @IsInt()
  @Max(9999)
  status: number;
}

export class CreateStoreInputDto extends PickType(CreateStoreDto, [
  'store_name',
  'id_code',
  'id_name',
  'phone',
  'province',
  'city',
  'area',
  'town',
  'address',
]) {
  @ApiProperty()
  store_name: string;

  @ApiProperty()
  id_code: string;

  @ApiProperty()
  id_name: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  province: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  area: string;

  @ApiProperty()
  town: string;

  @ApiProperty()
  address: string;
}
