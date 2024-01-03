import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGoodDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  store_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  category_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  @ApiProperty()
  name: string;

  @IsString()
  @ApiProperty()
  description: string;
}
