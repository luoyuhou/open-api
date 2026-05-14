import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class HandleRefundDto {
  @ApiProperty({ description: '操作: approve同意, reject拒绝' })
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiProperty({ description: '拒绝原因（拒绝时必填）', required: false })
  @IsOptional()
  @IsString()
  rejectReason?: string;
}
