import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateOrderGoodsDto } from './create-order-goods.dto';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  store_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  user_address_id: string;

  @IsArray()
  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderGoodsDto)
  goods: CreateOrderGoodsDto[];

  @IsDate()
  @IsNotEmpty()
  @ApiProperty()
  delivery_date: Date;
}
