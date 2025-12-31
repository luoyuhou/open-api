import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalScanAuthGuard extends AuthGuard('local-scan') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      const result = (await super.canActivate(context)) as boolean;

      if (context.getType() === 'http' && request.user) {
        // 执行 Passport 登录
        await super.logIn(request);

        // 🔑 显式保存 session 到 Redis
        await new Promise<void>((resolve, reject) => {
          request.session.save((err: any) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }

      return result;
    } catch (error) {
      // 如果是非 confirmed 状态，允许通过但不执行登录
      if ((error as any).qrCodeResult) {
        request.qrCodeResult = (error as any).qrCodeResult;
        return true;
      }
      throw error;
    }
  }
}
