import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FeedbackAttachmentDto {
  @ApiProperty({ description: '附件类型：image, video', example: 'image' })
  @IsString()
  @IsIn(['image', 'video'])
  type: 'image' | 'video';

  @ApiProperty({ description: '附件 URL' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  url: string;

  @ApiProperty({ description: '附件说明', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(256)
  description?: string;
}

export class CreateFeedbackDto {
  @ApiProperty({ description: '建议标题' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  title: string;

  @ApiProperty({ description: '建议内容' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;

  @ApiProperty({ description: '分类，如 feature, bug, ui 等', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  category?: string;

  @ApiProperty({
    description: '附件列表（图片或视频链接）',
    type: FeedbackAttachmentDto,
    isArray: true,
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeedbackAttachmentDto)
  @IsOptional()
  attachments?: FeedbackAttachmentDto[];
}
