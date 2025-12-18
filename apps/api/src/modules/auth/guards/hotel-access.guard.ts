import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class HotelAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super admin has access to all hotels
    if (user.role === UserRole.super_admin) {
      return true;
    }

    // Get hotel ID from request (params, body, or query)
    const hotelId =
      request.params?.hotelId ||
      request.body?.hotelId ||
      request.query?.hotelId;

    // If no hotel ID in request, allow (some routes don't need it)
    if (!hotelId) {
      return true;
    }

    // Check if user belongs to this hotel
    if (user.hotelId !== hotelId) {
      // Return 404 instead of 403 to prevent information leakage
      throw new NotFoundException('Resource not found');
    }

    return true;
  }
}
