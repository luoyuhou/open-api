import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { PickType } from '@nestjs/mapped-types';
import { STORE_ACTION_TYPES } from '../const';

export class ApplyStoreHistoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  store_id: string;

  @IsInt()
  @IsNotEmpty()
  action_type: STORE_ACTION_TYPES;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  action_content: string;

  @IsString()
  @IsNotEmpty()
  applicant_user_id: string;

  @IsString()
  @IsNotEmpty()
  applicant_date: Date;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  replient_user_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  replient_content: string;

  @IsDate()
  replient_date: Date;
}

export class ApplicantStoreHistoryInputDto extends PickType(
  ApplyStoreHistoryDto,
  [
    'store_id',
    'action_type',
    'action_content',
    'applicant_user_id',
    'applicant_date',
  ],
) {}
