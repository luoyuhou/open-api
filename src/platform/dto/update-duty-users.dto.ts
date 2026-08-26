import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateDutyUsersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  user_ids: string[];
}
