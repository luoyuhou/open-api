import { PartialType } from '@nestjs/swagger';
import { CreateMemberDto } from './create-member.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum } from 'class-validator';

export class UpdateMemberDto extends PartialType(CreateMemberDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @IsEnum([0, 1])
  status?: number;
}
