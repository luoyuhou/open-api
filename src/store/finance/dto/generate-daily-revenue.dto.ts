import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateDailyRevenueDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  store_id: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @ApiProperty({ description: 'YYYY-MM-DD' })
  record_date: string;
}
