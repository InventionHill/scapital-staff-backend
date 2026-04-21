import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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
  Response<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T> | T> {
    const skipTransform = this.reflector.get<boolean>(
      'keep-raw-response',
      context.getHandler(),
    );

    if (skipTransform) {
      return next.handle();
    }

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
        // Handle cases where data is already wrapped or has a message
        let message = defaultMessage;
        let responseData = data;

        if (data && typeof data === 'object') {
          if (data.message) {
            message = data.message;
            // If it's a wrapper like { message, data }, unwrap it
            if (data.data !== undefined) {
              responseData = data.data;
            } else {
              // If it's just { message, ...otherFields }, remove message from data
              const { message: _message, ...rest } = data;
              responseData = rest;
            }
          }
        }

        return {
          status: true,
          message,
          data: responseData || {},
        };
      }),
    );
  }
}
