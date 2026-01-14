import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateHomeBannerDto {
  @ApiProperty({ description: '标题' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  title: string;

  @ApiProperty({ description: '描述', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(256)
  description?: string;

  @ApiProperty({ description: '图片地址（URL）' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  image_url: string;

  @ApiProperty({ description: '宽度(px)', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  width?: number;

  @ApiProperty({ description: '高度(px)', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  height?: number;

  @ApiProperty({
    description: '排序（数字越小越靠前）',
    required: false,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  sort?: number;

  @ApiProperty({
    description: '状态：1 启用，0 禁用',
    required: false,
    default: 1,
  })
  @IsInt()
  @IsOptional()
  status?: number;
}
