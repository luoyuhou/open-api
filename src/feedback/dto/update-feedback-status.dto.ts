import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty } from 'class-validator';

export class UpdateFeedbackStatusDto {
  @ApiProperty({
    description: '状态：0=待处理，1=处理中，2=已完成，3=不采纳, -1=取消',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  @IsIn([0, 1, 2, 3, -1])
  status: number;
}
