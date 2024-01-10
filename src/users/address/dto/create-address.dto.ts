import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  recipient: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  @ApiProperty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  @ApiProperty()
  province: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  @ApiProperty()
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  @ApiProperty()
  area: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  @ApiProperty()
  town: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @ApiProperty()
  address: string;

  @IsBoolean()
  @IsOptional()
  @IsEnum([true, false])
  @ApiProperty()
  is_default: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(8)
  @ApiProperty()
  tag: string;
}
