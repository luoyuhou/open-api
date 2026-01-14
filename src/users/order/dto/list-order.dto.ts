import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ListOrderDto {
  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty()
  page: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty()
  pageSize: string;

  @IsNumberString()
  @ApiProperty()
  @IsOptional()
  @IsEnum(['0', '1', '2', '3', '4'])
  stage: string;
}
