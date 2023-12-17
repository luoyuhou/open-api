import {
  IsInt,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StoreEntity {
  constructor(partial: Partial<StoreEntity>) {
    Object.assign(this, partial);
  }
  @ApiProperty()
  id: number;

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
  @IsNotEmpty()
  @IsPhoneNumber()
  @MaxLength(11)
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
  district: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  address: string;

  @IsInt()
  @Max(9999)
  status: number;
}
