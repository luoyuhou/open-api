import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import customLogger from '../../common/logger';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean;

    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();

      await super.logIn(request);

      // 🔑 显式保存 session 到 Redis
      await new Promise<void>((resolve, reject) => {
        request.session.save((err: object) => {
          if (err) {
            customLogger.error({
              message: '❌ LocalAuthGuard: 保存 session 到 Redis 失败:',
              error: err,
            });
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    return result;
  }
}
