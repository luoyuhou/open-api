import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsPhoneNumber,
} from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ description: '店铺ID' })
  @IsNotEmpty()
  @IsString()
  store_id: string;

  @ApiProperty({ description: '员工姓名' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: '员工手机号' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: '关联用户ID' })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional({ description: '状态 (1: 正常, 0: 禁用)', default: 1 })
  @IsOptional()
  @IsInt()
  status?: number;
}
