import {
  IsArray,
  IsInt,
  IsNotEmpty,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Pagination {
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @ApiProperty()
  pageNum: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(10)
  @ApiProperty()
  pageSize: number;

  @IsArray()
  @MaxLength(1)
  @ApiProperty()
  sorted: { id: string; desc: boolean }[];

  @IsArray()
  @ApiProperty()
  filtered: { id: string; value: boolean | number | string | never[] }[];
}
