//src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Login_SOURCE_TYPES } from '../const';
import { PickType } from '@nestjs/mapped-types';

export class AddLoginHistoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @ApiProperty()
  user_id: string;

  @IsString()
  @MinLength(64)
  @ApiProperty()
  ip: string;

  @IsString()
  @ApiProperty()
  userAgent: string;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty()
  source: Login_SOURCE_TYPES;
}

export class AddLoginHistoryByInputDto extends PickType(AddLoginHistoryDto, [
  'ip',
  'userAgent',
]) {}
