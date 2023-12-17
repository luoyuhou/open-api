import { ApiProperty } from '@nestjs/swagger';
import { STORE_ACTION_TYPES } from '../const';
import { IsEnum } from 'class-validator';

export class StoreHistoryEntity {
  constructor(partial: Partial<StoreHistoryEntity>) {
    Object.assign(this, partial);
  }

  @ApiProperty()
  id: number;

  @ApiProperty()
  store_id: string;

  @ApiProperty()
  @IsEnum(STORE_ACTION_TYPES)
  action_type: STORE_ACTION_TYPES;

  @ApiProperty()
  action_context: string;

  @ApiProperty()
  applicant_user_id: string;

  @ApiProperty()
  applicant_date: Date;

  @ApiProperty()
  replient_user_id: string;

  @ApiProperty()
  replient_content: string;

  @ApiProperty()
  create_date: Date;

  @ApiProperty()
  update_date: Date;
}
