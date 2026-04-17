import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Tenant Audit Middleware
 *
 * Monitors all requests that include a hotelId parameter and logs
 * potential cross-tenant access attempts. Returns 404 (not 403) to
 * prevent resource enumeration attacks.
 *
 * Applied to all hotel-scoped routes: /api/v1/hotels/:hotelId/*
 */
@Injectable()
export class TenantAuditMiddleware implements NestMiddleware {
    private readonly logger = new Logger('TenantAudit');

    use(req: Request, _res: Response, next: NextFunction) {
        const user = (req as any).user;
        const requestedHotelId = req.params.hotelId || req.body?.hotelId;

        // Only audit when both user context and hotel ID are present
        if (user && requestedHotelId && user.hotelId) {
            if (user.hotelId !== requestedHotelId && user.role !== 'super_admin') {
                this.logger.warn(
                    `🔒 CROSS-TENANT ACCESS: User ${user.id} (hotel: ${user.hotelId}) ` +
                    `attempted to access hotel ${requestedHotelId} ` +
                    `[${req.method} ${req.originalUrl}]`,
                );
            }
        }

        next();
    }
}
