// src/auth/dto/qr-login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 生成二维码响应
 */
export class QrCodeResponse {
  @ApiProperty({ description: '二维码唯一标识' })
  qrCodeId: string;

  @ApiProperty({ description: '二维码内容(用于生成二维码)' })
  qrCodeContent: string;

  @ApiProperty({ description: '过期时间(秒)' })
  expiresIn: number;
}

/**
 * 查询二维码状态响应
 */
export enum QrCodeStatus {
  PENDING = 'pending', // 待扫描
  SCANNED = 'scanned', // 已扫描，待确认
  CONFIRMED = 'confirmed', // 已确认
  EXPIRED = 'expired', // 已过期
  CANCELLED = 'cancelled', // 已取消
}

export class QrCodeStatusResponse {
  @ApiProperty({ enum: QrCodeStatus })
  status: QrCodeStatus;

  @ApiProperty({ description: '用户信息(仅confirmed状态)', required: false })
  user?: any;

  @ApiProperty({ description: '过期剩余时间(秒)', required: false })
  remainingTime?: number;
}

/**
 * 小程序确认登录 DTO
 */
export class ConfirmQrLoginDto {
  @ApiProperty({ description: '二维码ID' })
  @IsNotEmpty()
  @IsString()
  qrCodeId: string;

  @ApiProperty({ description: '微信用户openid' })
  @IsNotEmpty()
  @IsString()
  openid: string;
}

/**
 * 小程序扫描二维码 DTO
 */
export class ScanQrCodeDto {
  @ApiProperty({ description: '二维码ID' })
  @IsNotEmpty()
  @IsString()
  qrCodeId: string;

  @ApiProperty({ description: '微信用户openid' })
  @IsNotEmpty()
  @IsString()
  openid: string;
}
