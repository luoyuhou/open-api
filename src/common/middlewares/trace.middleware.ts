import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, Request } from 'express';
import rTracer = require('cls-rtracer');

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    res.setHeader('trace-id', rTracer.id() as string);

    next();
  }
}
