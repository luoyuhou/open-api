import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { E_USER_ORDER_STATUS } from '../const';

export class UpdateOrderDto {
  @IsInt()
  @IsNotEmpty()
  @IsEnum([
    E_USER_ORDER_STATUS.delivery,
    E_USER_ORDER_STATUS.received,
    E_USER_ORDER_STATUS.finished,
  ])
  @ApiProperty()
  type: number;
}
