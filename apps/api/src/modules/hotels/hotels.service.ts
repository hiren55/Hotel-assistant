import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateHotelDto, HotelResponseDto } from './dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class HotelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string, _userId: string, userRole: UserRole, userHotelId: string | null): Promise<HotelResponseDto> {
    // Super admin can access any hotel
    if (userRole !== UserRole.super_admin && userHotelId !== id) {
      throw new NotFoundException('Hotel not found');
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    return this.toResponseDto(hotel);
  }

  async findBySlug(slug: string): Promise<HotelResponseDto | null> {
    const hotel = await this.prisma.hotel.findUnique({
      where: { slug },
    });

    if (!hotel) {
      return null;
    }

    return this.toResponseDto(hotel);
  }

  async update(
    id: string,
    dto: UpdateHotelDto,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<HotelResponseDto> {
    // Only owner or super admin can update
    if (userRole !== UserRole.super_admin && userRole !== UserRole.hotel_owner) {
      throw new ForbiddenException('Only hotel owner can update hotel details');
    }

    if (userRole !== UserRole.super_admin && userHotelId !== id) {
      throw new NotFoundException('Hotel not found');
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    // Merge settings and branding with existing values
    const updatedSettings = dto.settings
      ? { ...(hotel.settings as object), ...dto.settings }
      : hotel.settings;

    const updatedBranding = dto.branding
      ? { ...(hotel.branding as object), ...dto.branding }
      : hotel.branding;

    const updatedAddress = dto.address
      ? { ...(hotel.address as object), ...dto.address }
      : hotel.address;

    const updatedHotel = await this.prisma.hotel.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(updatedAddress && { address: updatedAddress }),
        ...(updatedSettings && { settings: updatedSettings }),
        ...(updatedBranding && { branding: updatedBranding }),
      },
    });

    // Create audit log
    await this.createAuditLog(id, userId, 'update_hotel', 'hotel', id, dto);

    return this.toResponseDto(updatedHotel);
  }

  async getSettings(
    id: string,
    _userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<any> {
    if (userRole !== UserRole.super_admin && userHotelId !== id) {
      throw new NotFoundException('Hotel not found');
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      select: { settings: true, branding: true },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    return {
      settings: hotel.settings,
      branding: hotel.branding,
    };
  }

  async updateSettings(
    id: string,
    settings: any,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<any> {
    if (userRole !== UserRole.super_admin && userRole !== UserRole.hotel_owner) {
      throw new ForbiddenException('Only hotel owner can update settings');
    }

    if (userRole !== UserRole.super_admin && userHotelId !== id) {
      throw new NotFoundException('Hotel not found');
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const updatedHotel = await this.prisma.hotel.update({
      where: { id },
      data: {
        settings: { ...(hotel.settings as object), ...settings },
      },
      select: { settings: true, branding: true },
    });

    await this.createAuditLog(id, userId, 'update_settings', 'hotel', id, settings);

    return updatedHotel;
  }

  async getStats(
    id: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<any> {
    if (userRole !== UserRole.super_admin && userHotelId !== id) {
      throw new NotFoundException('Hotel not found');
    }

    const [roomCount, bookingCount, activeBookings, todayCheckIns, todayCheckOuts] =
      await Promise.all([
        this.prisma.room.count({ where: { hotelId: id } }),
        this.prisma.booking.count({ where: { hotelId: id } }),
        this.prisma.booking.count({
          where: {
            hotelId: id,
            status: 'confirmed',
            checkIn: { lte: new Date() },
            checkOut: { gte: new Date() },
          },
        }),
        this.prisma.booking.count({
          where: {
            hotelId: id,
            checkIn: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
        this.prisma.booking.count({
          where: {
            hotelId: id,
            checkOut: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
      ]);

    return {
      rooms: roomCount,
      totalBookings: bookingCount,
      activeBookings,
      todayCheckIns,
      todayCheckOuts,
    };
  }

  private toResponseDto(hotel: any): HotelResponseDto {
    return {
      id: hotel.id,
      name: hotel.name,
      slug: hotel.slug,
      subdomain: hotel.subdomain,
      email: hotel.email,
      phone: hotel.phone,
      address: hotel.address,
      branding: hotel.branding,
      settings: hotel.settings,
      status: hotel.status,
      subscriptionTier: hotel.subscriptionTier,
      subscriptionStatus: hotel.subscriptionStatus,
      trialEndsAt: hotel.trialEndsAt,
      createdAt: hotel.createdAt,
      updatedAt: hotel.updatedAt,
    };
  }

  private async createAuditLog(
    hotelId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes?: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          hotelId,
          userId,
          action,
          entityType,
          entityId,
          changes: changes ? JSON.parse(JSON.stringify(changes)) : null,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}
