import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-request-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers[CORRELATION_ID_HEADER] || uuidv4();

    // Set correlation ID on request
    req.headers[CORRELATION_ID_HEADER] = correlationId as string;

    // Set correlation ID on response
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    next();
  }
}
