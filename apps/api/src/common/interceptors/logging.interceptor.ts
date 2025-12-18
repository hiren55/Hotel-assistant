import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const requestId = request.headers[CORRELATION_ID_HEADER] as string;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;

          this.logger.log({
            message: `${method} ${url} ${response.statusCode}`,
            requestId,
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            ip: this.sanitizeIp(ip),
            userAgent: userAgent.substring(0, 100),
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          this.logger.error({
            message: `${method} ${url} ERROR`,
            requestId,
            method,
            url,
            duration: `${duration}ms`,
            error: error.message,
          });
        },
      })
    );
  }

  private sanitizeIp(ip: string | undefined): string {
    if (!ip) return 'unknown';
    // Remove port if present
    return ip.replace(/:\d+$/, '');
  }
}
