import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFeedbackCommentDto {
  @ApiProperty({ description: '评论内容' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  content: string;

  @ApiProperty({ description: '父评论ID，用于回复', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  parent_id?: number;
}
