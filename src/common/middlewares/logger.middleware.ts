import { Injectable, NestMiddleware } from '@nestjs/common';
import customLogger from '../logger';
import { Response } from 'express';
import rTracer from 'cls-rtracer';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    const start = new Date().getTime();

    res.on('finish', () => {
      const end = new Date().getTime();
      const requester = {
        request: { path: req.url, method: req.method, reqBody: req.body },
        'cost-time': `${end - start} ms`,
      };
      customLogger.log(requester);
    });

    next();
  }
}
