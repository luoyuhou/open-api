import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { E_USER_ORDER_STATUS } from '../const';

export class RemoveOrderDto {
  @IsInt()
  @IsNotEmpty()
  @IsEnum([E_USER_ORDER_STATUS.cancel, E_USER_ORDER_STATUS.delete])
  @ApiProperty()
  type: number;
}
