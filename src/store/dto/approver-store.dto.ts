import { PickType } from '@nestjs/mapped-types';
import { CreateStoreDto } from './create-store.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { STORE_STATUS_TYPES } from '../const';

export class ApproverStoreDto extends PickType(CreateStoreDto, [
  'store_id',
  'status',
]) {
  @ApiProperty()
  store_id: string;

  @ApiProperty()
  @IsEnum([
    STORE_STATUS_TYPES.PREVIEW,
    STORE_STATUS_TYPES.REVIEWED,
    STORE_STATUS_TYPES.APPROVED,
    STORE_STATUS_TYPES.REJECTED,
    STORE_STATUS_TYPES.FROZEN,
  ])
  status: number;
}
