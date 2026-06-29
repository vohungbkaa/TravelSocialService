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

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const nodeEnv = this.configService.get<string>('app.nodeEnv') || 'development';
    const isProduction = nodeEnv === 'production';

    let code = ErrorCode.INTERNAL_ERROR;
    let message = 'An unexpected error occurred';
    let details: any = null;

    if (exception instanceof HttpException) {
      const resPayload = exception.getResponse();
      message = exception.message;

      switch (status) {
        case HttpStatus.BAD_REQUEST:
          code = ErrorCode.VALIDATION_ERROR;
          break;
        case HttpStatus.UNAUTHORIZED:
          code = ErrorCode.UNAUTHORIZED;
          break;
        case HttpStatus.FORBIDDEN:
          code = ErrorCode.FORBIDDEN;
          break;
        case HttpStatus.NOT_FOUND:
          code = ErrorCode.NOT_FOUND;
          break;
        case HttpStatus.CONFLICT:
          code = ErrorCode.CONFLICT;
          break;
        default:
          code = ErrorCode.INTERNAL_ERROR;
      }

      if (typeof resPayload === 'object' && resPayload !== null) {
        const payloadMsg = (resPayload as any).message;
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
      message = exception instanceof Error ? exception.message : String(exception);
    }

    const errorResponse: ApiResponse = {
      error: {
        code,
        message,
        ...(details && { details }),
        ...(!isProduction && {
          stack: exception instanceof Error ? exception.stack : undefined,
        }),
      },
    };

    response.status(status).json(errorResponse);
  }
}
