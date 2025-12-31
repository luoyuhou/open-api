import { Injectable, NestMiddleware } from '@nestjs/common';
import customLogger from '../logger';
import { Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  // 不需要记录日志的路径列表（支持正则表达式）
  private readonly excludedPaths: RegExp[] = [
    /^\/auth\/qr-code\/status\/.+$/, // 排除二维码状态查询（轮询接口）
    /^\/auth\/qr-code\/generate$/,
    // 可以添加更多需要排除的路径
    // /^\/api\/health$/,
    // /^\/api\/metrics$/,
  ];

  /**
   * 判断是否应该跳过日志记录
   */
  private shouldSkipLogging(url: string): boolean {
    return this.excludedPaths.some((pattern) => pattern.test(url));
  }

  use(req: Request, res: Response, next: () => void) {
    const start = new Date().getTime();

    res.on('finish', () => {
      // 如果是需要排除的路径，直接返回不记录日志
      if (this.shouldSkipLogging(req.url)) {
        return;
      }

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
