import {
  IsInt,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PickType } from '@nestjs/mapped-types';

export class CreateUserDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  @MaxLength(64)
  user_id: string;

  @IsInt()
  @IsNotEmpty()
  @MaxLength(4)
  status: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @ApiProperty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @ApiProperty()
  last_name: string;

  @IsString()
  @MaxLength(64)
  @ApiProperty()
  email: string;

  @IsString()
  @IsPhoneNumber()
  @IsNotEmpty()
  @MaxLength(11)
  @ApiProperty()
  phone: string;

  @IsString()
  @MaxLength(256)
  @ApiProperty()
  avatar: string;
}

export class CreateUserByPasswordDto extends PickType(CreateUserDto, [
  'first_name',
  'last_name',
  'phone',
]) {
  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  password: string;
}
