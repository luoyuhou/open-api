import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString } from 'class-validator';

export class SendSmsDto {
  @ApiProperty({ example: '13800138000' })
  @IsPhoneNumber('CN')
  phone: string;

  @ApiProperty({ example: '123abc' })
  @IsString()
  token: string;
}

export class RegisterWithSmsDto {
  @ApiProperty({ example: '13800138000' })
  @IsPhoneNumber('CN')
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  code: string;

  // Include other fields for registration if needed, but the user might just want to add SMS verification to the existing flow.
}
