import { ApiProperty } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { PickType } from '@nestjs/mapped-types';

export class UpdateCategoryDto extends PickType(CreateCategoryDto, [
  'name',
  'pid',
]) {
  @ApiProperty()
  name: string;

  @ApiProperty()
  pid: string;
}
