import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class AdjustAttendanceDto {
  @ApiProperty({ description: '门店ID' })
  @IsNotEmpty()
  @IsString()
  store_id: string;

  @ApiProperty({ description: '员工ID' })
  @IsNotEmpty()
  @IsString()
  staff_id: string;

  @ApiProperty({ description: '工作日 YYYY-MM-DD' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '日期格式应为 YYYY-MM-DD' })
  work_date: string;

  @ApiPropertyOptional({ description: '上班时间 ISO 字符串' })
  @IsOptional()
  @IsString()
  check_in_at?: string;

  @ApiPropertyOptional({ description: '下班时间 ISO 字符串' })
  @IsOptional()
  @IsString()
  check_out_at?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
