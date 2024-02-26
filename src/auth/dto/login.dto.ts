//src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber('CN')
  @ApiProperty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  @ApiProperty()
  password: string;
}

export class VerifyCodeDot {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  code: string;
}

export class WxLoginDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  uuid: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  rawData: string;
}

export class WxUserInfo {
  @IsString()
  avatarUrl: string;

  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsInt()
  gender: number;

  @IsString()
  @IsEnum(['en', 'zh_CN', 'zh_TW'])
  language: 'zh_CN';

  @IsString()
  nickName: string;

  @IsString()
  province: string;
}
