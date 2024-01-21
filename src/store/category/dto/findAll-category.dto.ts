import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FindAllCategoryDto {
  @IsString()
  @IsOptional()
  @ApiProperty()
  pid: string;
}
