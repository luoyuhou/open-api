import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserEntity } from '../../users/entities/user.entity';
import customLogger from '../logger';
import { API_SOURCE_TYPES } from '../../auth/const';
import { parse } from 'useragent';

@Injectable()
export class RecordFetchMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    const { url, method, user, headers } = req;

    let source =
      url.indexOf('/wx/') === 0 ? API_SOURCE_TYPES.WECHAT : API_SOURCE_TYPES.UI;

    if (source === API_SOURCE_TYPES.UI) {
      const userAgent = headers['user-agent'];
      const parsedUserAgent = parse(userAgent);
      const isMobile = /Mobile|Android|iPhone|iPad|iPod/.test(
        parsedUserAgent.toString(),
      );

      source = isMobile ? API_SOURCE_TYPES.MOBILE : source;
    }

    if (user) {
      new PrismaClient().user_fetch
        .create({
          data: {
            user_id: (user as UserEntity).user_id,
            url,
            source: source,
            method: method.toUpperCase(),
          },
        })
        .catch((err) => {
          return customLogger.error({ message: `Failed record fetch` }, err);
        });
    }

    next();
  }
}
