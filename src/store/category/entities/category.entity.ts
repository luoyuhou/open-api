import { ApiProperty } from '@nestjs/swagger';

export class CategoryGoods {
  constructor(partial: Partial<CategoryGoods>) {
    Object.assign(this, partial);
  }

  @ApiProperty()
  id: number;

  @ApiProperty()
  category_id: string;

  @ApiProperty()
  store_id: string;

  @ApiProperty()
  pid: string;

  @ApiProperty()
  rank: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  status: number;

  @ApiProperty()
  create_date: Date;

  @ApiProperty()
  update_date: Date;
}
