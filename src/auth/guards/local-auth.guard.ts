import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean;

    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();

      await super.logIn(request);

      // 🔑 显式保存 session 到 Redis
      await new Promise<void>((resolve, reject) => {
        request.session.save((err) => {
          if (err) {
            console.error(
              '❌ LocalAuthGuard: 保存 session 到 Redis 失败:',
              err,
            );
            reject(err);
          } else {
            console.log(
              '✅ LocalAuthGuard: Session 已保存到 Redis, sessionID:',
              request.sessionID,
            );
            resolve();
          }
        });
      });
    }

    return result;
  }
}
