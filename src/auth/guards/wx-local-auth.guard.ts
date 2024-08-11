import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class WxLocalAuthGuard extends AuthGuard('wx-local') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('---------------');
    const result = (await super.canActivate(context)) as boolean;
    console.log(2222222);
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();

      await super.logIn(request);
    }

    return result;
  }
}
