import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { AuthService } from '../auth.service';
import { Request } from 'express';

@Injectable()
export class LocalScanStrategy extends PassportStrategy(
  Strategy,
  'local-scan',
) {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(request: Request): Promise<any> {
    const qrCodeId = request.params.qrCodeId;

    if (!qrCodeId) {
      throw new UnauthorizedException('Missing qrCodeId');
    }

    const result = await this.authService.checkQrCodeStatus(qrCodeId);

    // 只有在 confirmed 状态时才返回用户
    if (result.status === 'confirmed' && result.user) {
      // 将完整结果附加到 request 上，供 controller 使用
      (request as any).qrCodeResult = result;
      return result.user;
    }

    // 其他状态抛出特殊异常，由 Guard 捕获
    const error = new UnauthorizedException('QR code not confirmed');
    (error as any).qrCodeResult = result;
    throw error;
  }
}
