import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Optional } from '@nestjs/common';

export class CreateStoreServicePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @IsString()
  description: string;

  @IsInt()
  @Min(0)
  monthly_fee: number;
}

export class UpdateStoreServicePlanStatusDto {
  @IsBoolean()
  is_active: boolean;
}

export class ListStoreServiceSubscriptionsDto {
  @IsString()
  @IsOptional()
  store_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}

export class CreateStoreServiceSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  store_id: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  plan_id: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_date?: Date;
}

export class ListStoreServiceInvoicesDto {
  @IsOptional()
  @IsString()
  store_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}

export class PayStoreServiceInvoiceDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class ListStoreServiceContractsDto {
  @IsOptional()
  @IsString()
  store_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}

export class CreateStoreServiceContractDto {
  @IsString()
  @IsNotEmpty()
  store_id: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  plan_id: number;

  @IsOptional()
  @IsString()
  contract_no?: string;

  @Type(() => Date)
  @IsDate()
  start_date: Date;

  @Type(() => Date)
  @IsDate()
  end_date: Date;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  total_amount: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sign_type: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  signed_at?: Date;

  @IsOptional()
  @IsString()
  file_url?: string;
}
