import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from '../auth.service';
import { UserEntity } from '../../users/entities/user.entity';
import Env from '../../common/const/Env';

@Injectable()
export class TokenInterceptor implements NestInterceptor {
  constructor(private readonly authService: AuthService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((body) => {
        const response = context.switchToHttp().getResponse<Response>();
        const user = this.extractUser(body);
        if (user?.user_id) {
          const token = this.authService.signToken(user as UserEntity);
          response.setHeader('Authorization', `Bearer ${token}`);
          response.cookie('token', token, {
            httpOnly: true,
            signed: true,
            sameSite: 'strict',
            secure: Env.IS_PROD,
          });
        }
        return body;
      }),
    );
  }

  /** 兼容直接返回 UserEntity 或 { data: UserEntity } 包装 */
  private extractUser(body: unknown): { user_id?: string } | null {
    if (!body || typeof body !== 'object') return null;
    const obj = body as Record<string, unknown>;
    if (typeof obj.user_id === 'string') {
      return obj as { user_id: string };
    }
    const data = obj.data;
    if (
      data &&
      typeof data === 'object' &&
      typeof (data as any).user_id === 'string'
    ) {
      return data as { user_id: string };
    }
    return null;
  }
}
