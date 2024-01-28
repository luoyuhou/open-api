import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateGoodsVersionDto } from './create-goods-version.dto';

export class UpsertGoodsVersionDto extends CreateGoodsVersionDto {
  @IsInt()
  @ApiProperty()
  @IsEnum([0, 1])
  status: number;

  @IsString()
  @IsOptional()
  @ApiProperty()
  version_id: string;
}
