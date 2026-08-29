import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PunchDto {
  @ApiProperty({ description: '门店ID' })
  @IsNotEmpty()
  @IsString()
  store_id: string;

  @ApiProperty({ description: '打卡类型', enum: ['in', 'out'] })
  @IsNotEmpty()
  @IsIn(['in', 'out'])
  type: 'in' | 'out';
}
