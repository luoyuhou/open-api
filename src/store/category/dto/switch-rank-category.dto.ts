import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchRankCategoryDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['up', 'down'])
  @ApiProperty()
  type: string;
}
