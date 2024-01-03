import { CreateGoodDto } from './create-good.dto';
import { PickType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateGoodDto extends PickType(CreateGoodDto, [
  'category_id',
  'name',
  'description',
]) {
  @ApiProperty()
  category_id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;
}
