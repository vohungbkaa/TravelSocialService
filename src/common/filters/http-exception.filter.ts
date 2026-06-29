import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../errors/error-codes';
import { ApiResponse } from '../types/api-response.type';

interface HttpErrorPayload {
  message?: string | string[];
}

function isHttpErrorPayload(value: unknown): value is HttpErrorPayload {
  return typeof value === 'object' && value !== null && 'message' in value;
}

const httpStatusToErrorCode: Readonly<Record<number, ErrorCode>> = {
  [400]: ErrorCode.VALIDATION_ERROR,
  [401]: ErrorCode.UNAUTHORIZED,
  [403]: ErrorCode.FORBIDDEN,
  [404]: ErrorCode.NOT_FOUND,
  [409]: ErrorCode.CONFLICT,
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const nodeEnv =
      this.configService.get<string>('app.nodeEnv') || 'development';
    const isProduction = nodeEnv === 'production';

    let code = ErrorCode.INTERNAL_ERROR;
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof HttpException) {
      const resPayload = exception.getResponse();
      message = exception.message;
      code = httpStatusToErrorCode[status] ?? ErrorCode.INTERNAL_ERROR;

      if (isHttpErrorPayload(resPayload)) {
        const payloadMsg = resPayload.message;
        if (Array.isArray(payloadMsg)) {
          message = 'Validation failed';
          details = {
            errors: payloadMsg,
          };
        } else if (typeof payloadMsg === 'string') {
          message = payloadMsg;
        }
      }
    } else {
      message =
        exception instanceof Error ? exception.message : String(exception);
    }

    const errorResponse: ApiResponse = {
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
        ...(!isProduction && {
          stack: exception instanceof Error ? exception.stack : undefined,
        }),
      },
    };

    response.status(status).json(errorResponse);
  }
}
