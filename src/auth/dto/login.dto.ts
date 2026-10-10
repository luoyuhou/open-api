//src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
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

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  appType?: 'user' | 'cashier' | 'publisher';
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

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  appType?: 'user' | 'cashier' | 'publisher';
}

export class WxPhoneLoginDto {
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber('CN')
  @ApiProperty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  smsCode: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false, description: '微信 openid，与 code 二选一' })
  openid?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    required: false,
    description: 'wx.login code，与 openid 二选一',
  })
  code?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  appType?: 'user' | 'cashier' | 'publisher';
}

export class BindPhoneDto {
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber('CN')
  @ApiProperty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  smsCode: string;
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
