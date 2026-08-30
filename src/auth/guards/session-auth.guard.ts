import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CacheService } from '../../common/cache-manager/cache.service';
import { UserEntity } from '../../users/entities/user.entity';

@Injectable()
export class SessionAuthGuard extends AuthGuard('session') {
  constructor(private readonly cacheService: CacheService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    const user = request.user as UserEntity;
    if (user?.user_id && (await this.cacheService.isUserKicked(user.user_id))) {
      await new Promise<void>((resolve) => {
        request.session?.destroy?.(() => resolve());
        if (!request.session?.destroy) resolve();
      });
      request.logout?.(() => undefined);
      throw new UnauthorizedException('账号已在其他设备下线，请重新登录');
    }

    return true;
  }
}
