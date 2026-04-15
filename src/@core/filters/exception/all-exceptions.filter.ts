import {
  Catch,
  ArgumentsHost,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception?.response?.message ||
      exception?.message ||
      'Internal server error';

    this.logger.error({
      stack: exception?.stack,
      message: message,
      status: status,
      name: exception?.name,
      error: exception?.response?.error || exception?.error,
      endpoint: request?.url,
    });

    response.status(status).json({
      status: false,
      message,
      data: {
        error:
          exception?.response?.error ||
          exception?.error ||
          'Internal Server Error',
        statusCode: status,
        path: request?.url,
      },
    });
  }
}
