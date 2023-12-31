import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchStoreDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @ApiProperty()
  @IsEnum(['name', 'address'])
  type: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @ApiProperty()
  value: string;
}
