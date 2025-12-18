import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

interface LogEntry {
  requestId: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode?: number;
  duration?: string;
  ip: string;
  userAgent: string;
  userId?: string;
  body?: any;
  query?: any;
  response?: any;
  error?: string;
}

@Injectable()
export class TerminalLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private requestCounter = 0;

  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isProduction =
      this.configService.get('NODE_ENV') === 'production';
    const isVerbose = !isProduction;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, body, query } = request;

    this.requestCounter++;
    const requestId = `REQ-${Date.now()}-${this.requestCounter}`;
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    const userAgent = request.get('user-agent') || 'unknown';
    const user = (request as any).user;

    // Log incoming request
    if (isVerbose) {
      this.logIncomingRequest({
        requestId,
        timestamp,
        method,
        url,
        ip: this.sanitizeIp(ip),
        userAgent: userAgent.substring(0, 80),
        userId: user?.id,
        body: this.sanitizeBody(body),
        query: Object.keys(query || {}).length > 0 ? query : undefined,
      });
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logCompletedRequest({
            requestId,
            timestamp,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            ip: this.sanitizeIp(ip),
            userAgent: userAgent.substring(0, 50),
            userId: user?.id,
            response: isVerbose ? this.sanitizeResponse(data) : undefined,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          this.logErrorRequest({
            requestId,
            timestamp,
            method,
            url,
            duration: `${duration}ms`,
            ip: this.sanitizeIp(ip),
            userAgent: userAgent.substring(0, 50),
            userId: user?.id,
            error: error.message,
          });
        },
      }),
    );
  }

  private logIncomingRequest(entry: Partial<LogEntry>) {
    const separator = '\x1b[36m' + '-'.repeat(70) + '\x1b[0m';

    console.log(separator);
    this.logger.log(
      `\x1b[33m>>> INCOMING REQUEST\x1b[0m [${entry.requestId}]`,
    );
    this.logger.log(`    Time: ${entry.timestamp}`);
    this.logger.log(`    ${entry.method} ${entry.url}`);
    this.logger.log(`    IP: ${entry.ip}`);
    this.logger.log(`    User-Agent: ${entry.userAgent}`);

    if (entry.userId) {
      this.logger.log(`    User ID: ${entry.userId}`);
    }

    if (entry.query) {
      this.logger.log(`    Query: ${JSON.stringify(entry.query)}`);
    }

    if (entry.body && Object.keys(entry.body).length > 0) {
      this.logger.log(`    Body: ${JSON.stringify(entry.body, null, 2)}`);
    }
  }

  private logCompletedRequest(entry: Partial<LogEntry>) {
    const statusColor = this.getStatusColor(entry.statusCode || 200);
    const statusEmoji = entry.statusCode && entry.statusCode < 400 ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';

    this.logger.log(
      `${statusEmoji} \x1b[32m<<< RESPONSE\x1b[0m [${entry.requestId}] ` +
        `${statusColor}${entry.statusCode}\x1b[0m ${entry.method} ${entry.url} (${entry.duration})`,
    );

    if (entry.response) {
      const responseStr = JSON.stringify(entry.response, null, 2);
      const truncated =
        responseStr.length > 500
          ? responseStr.substring(0, 500) + '...[truncated]'
          : responseStr;
      this.logger.log(`    Response: ${truncated}`);
    }

    const separator = '\x1b[36m' + '-'.repeat(70) + '\x1b[0m';
    console.log(separator);
  }

  private logErrorRequest(entry: Partial<LogEntry>) {
    const separator = '\x1b[31m' + '!'.repeat(70) + '\x1b[0m';

    console.log(separator);
    this.logger.error(
      `\x1b[31m✗ ERROR\x1b[0m [${entry.requestId}] ${entry.method} ${entry.url}`,
    );
    this.logger.error(`    Duration: ${entry.duration}`);
    this.logger.error(`    Error: ${entry.error}`);
    console.log(separator);
  }

  private getStatusColor(statusCode: number): string {
    if (statusCode < 300) return '\x1b[32m'; // Green
    if (statusCode < 400) return '\x1b[33m'; // Yellow
    if (statusCode < 500) return '\x1b[35m'; // Magenta
    return '\x1b[31m'; // Red
  }

  private sanitizeIp(ip: string | undefined): string {
    if (!ip) return 'unknown';
    return ip.replace(/:\d+$/, '').replace('::ffff:', '');
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'secret', 'apiKey'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeResponse(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = JSON.parse(JSON.stringify(data));
    const sensitiveFields = ['password', 'passwordHash', 'accessToken', 'refreshToken', 'token'];

    const redact = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      sensitiveFields.forEach((field) => {
        if (obj[field]) {
          obj[field] = '[REDACTED]';
        }
      });

      Object.values(obj).forEach((value) => {
        if (typeof value === 'object') {
          redact(value);
        }
      });
    };

    redact(sanitized);
    return sanitized;
  }
}
