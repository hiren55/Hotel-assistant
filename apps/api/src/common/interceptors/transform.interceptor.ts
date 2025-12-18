import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request.headers[CORRELATION_ID_HEADER] as string) || 'unknown';

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      }))
    );
  }
}
