import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
} from 'class-validator';

export class CreateMemberDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  store_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @IsEnum([0, 1, 2])
  gender?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  birthday?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  balance?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  points?: number;
}
