import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HttpLoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const endTime = Date.now();
      const statusCode = res.statusCode;
      const elapsedTime = endTime - startTime;

      this.logger.log({
        level: 'info',
        message: `${method}::${originalUrl} - ${statusCode} - ${elapsedTime}ms`,
        metadata: {
          userId: (req as any).user?.id,
        },
      });
    });

    next();
  }
}
