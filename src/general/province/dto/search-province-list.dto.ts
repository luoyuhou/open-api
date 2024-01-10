import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchProvinceListDto {
  @IsString()
  @IsOptional()
  @MinLength(6)
  @MaxLength(6)
  pid: string;
}
