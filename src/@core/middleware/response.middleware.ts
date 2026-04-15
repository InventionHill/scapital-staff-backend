import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ResponseMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const send = res.send;
    res.send = (exitData) => {
      if (
        res?.getHeader('content-type')?.toString().includes('application/json')
      ) {
        if (res.statusCode < 400) {
          const data = JSON.parse(exitData);

          exitData = {
            data: data?.pagination && data?.data ? data?.data : data,
            ...(data?.pagination ? { pagination: data.pagination } : {}),
          };
        }
      }
      res.send = send;
      return res.send(exitData);
    };
    next();
  }
}
