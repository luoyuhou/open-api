import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsIn, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({ description: '商品版本ID' })
  @IsString()
  versionId: string;

  @ApiProperty({ description: '数量' })
  @IsInt()
  @Min(0)
  count: number;

  @ApiProperty({ description: '操作类型: add增加, subtract减少, set设置' })
  @IsIn(['add', 'subtract', 'set'])
  operateType: 'add' | 'subtract' | 'set';
}
