import { CreateGoodDto } from './create-good.dto';
import { PartialType, PickType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateGoodDto extends PartialType(
  PickType(CreateGoodDto, ['category_id', 'name', 'description']),
) {
  @ApiProperty()
  category_id?: string;

  @ApiProperty()
  name?: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  price?: number;

  @ApiProperty()
  unit_name?: string;

  @ApiProperty()
  status?: number;
}
