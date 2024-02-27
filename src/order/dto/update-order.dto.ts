import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { E_USER_ORDER_STAGE, E_USER_ORDER_STATUS } from '../const';

export class UpdateOrderDto {
  @IsInt()
  @IsNotEmpty()
  @IsEnum([
    E_USER_ORDER_STAGE.delivery,
    E_USER_ORDER_STAGE.received,
    E_USER_ORDER_STAGE.finished,
  ])
  @ApiProperty()
  type: number;
}
