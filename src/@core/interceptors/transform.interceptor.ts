import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  status: boolean;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    let defaultMessage = 'Operation successful';
    if (method === 'GET') defaultMessage = 'Data fetched successfully';
    if (method === 'POST') defaultMessage = 'Resource created successfully';
    if (method === 'PATCH' || method === 'PUT')
      defaultMessage = 'Resource updated successfully';
    if (method === 'DELETE') defaultMessage = 'Resource deleted successfully';

    return next.handle().pipe(
      map((data) => {
        // If data already contains a message, use it
        const message = data?.message || defaultMessage;
        const responseData = data?.message && data?.data ? data.data : data;

        return {
          status: true,
          message,
          data: responseData || {},
        };
      }),
    );
  }
}
