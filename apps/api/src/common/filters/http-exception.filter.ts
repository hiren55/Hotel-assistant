import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = (request.headers[CORRELATION_ID_HEADER] as string) || 'unknown';
    const timestamp = new Date().toISOString();

    let status: number;
    let errorCode: string;
    let message: string;
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || exception.message;
        errorCode = (responseObj.error as string) || this.getErrorCodeFromStatus(status);
        details = responseObj.details;
      } else {
        message = exceptionResponse;
        errorCode = this.getErrorCodeFromStatus(status);
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorCode = 'INTERNAL_SERVER_ERROR';

      // Log the actual error for debugging
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack, {
        requestId,
        path: request.url,
        method: request.method,
      });
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      errorCode = 'INTERNAL_SERVER_ERROR';
    }

    // DEBUG INJECTION START
    try {
      const fs = require('fs');
      const extStr = exception instanceof Error ? JSON.stringify(exception, Object.getOwnPropertyNames(exception)) : JSON.stringify(exception);
      const logLine = `[${new Date().toISOString()}] ${status} ${request.method} ${request.url}\nException: ${extStr}\nMessage: ${message}\nDetails: ${JSON.stringify(details)}\n\n`;
      fs.appendFileSync('E:/AI-tool/api-debug.log', logLine);
    } catch (e) { }
    // DEBUG INJECTION END

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      meta: {
        requestId,
        timestamp,
      },
    };

    // Log the error (without sensitive data)
    this.logger.warn(`HTTP ${status} ${request.method} ${request.url}`, {
      requestId,
      errorCode,
      status,
    });

    response.status(status).json(errorResponse);
  }

  private getErrorCodeFromStatus(status: number): string {
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };

    return statusCodeMap[status] || 'UNKNOWN_ERROR';
  }
}
