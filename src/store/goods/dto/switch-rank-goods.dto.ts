import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchRankGoodsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsEnum(['up', 'down'])
  @ApiProperty({ required: false })
  type?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  target_id?: string;
}
