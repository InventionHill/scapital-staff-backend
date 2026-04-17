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

    const exceptionResponse =
      typeof exception.getResponse === 'function'
        ? exception.getResponse()
        : exception?.response;

    const message =
      exceptionResponse?.message ||
      exception?.message ||
      'Internal server error';

    this.logger.error({
      stack: exception?.stack,
      message: message,
      status: status,
      name: exception?.name,
      error: exceptionResponse?.error || exception?.error,
      endpoint: request?.url,
    });

    response.status(status).json({
      status: false,
      message: Array.isArray(message) ? message[0] : message,
      data: {
        error:
          exceptionResponse?.error ||
          exception?.error ||
          'Internal Server Error',
        statusCode: status,
      },
    });
  }
}
