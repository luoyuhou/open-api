import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class Sorted {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  id: string;

  @IsBoolean()
  @IsNotEmpty()
  @ApiProperty()
  desc: boolean;
}

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
  @ValidateNested({ each: true })
  @Type(() => Sorted)
  @ApiProperty()
  sorted: Sorted[];

  @IsArray()
  @ApiProperty()
  filtered: { id: string; value: boolean | number | string | never[] }[];
}
