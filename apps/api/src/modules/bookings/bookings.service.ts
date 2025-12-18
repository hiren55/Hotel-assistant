import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBookingDto,
  UpdateBookingDto,
  UpdateBookingStatusDto,
  BookingQueryDto,
  AvailabilityQueryDto,
  BookingResponseDto,
  BookingListResponseDto,
  AvailabilityResponseDto,
} from './dto';
import { UserRole, BookingStatus, RoomStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationService, BookingNotificationData } from '../email/notification.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async findAll(
    hotelId: string,
    query: BookingQueryDto,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<BookingListResponseDto> {
    if (userRole !== UserRole.super_admin && userHotelId !== hotelId) {
      throw new NotFoundException('Hotel not found');
    }

    const {
      page = 1,
      limit = 10,
      status,
      roomId,
      guestEmail,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (guestEmail) where.guestEmail = { contains: guestEmail, mode: 'insensitive' };
    if (fromDate) where.checkIn = { gte: fromDate };
    if (toDate) where.checkOut = { lte: toDate };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          room: { select: { id: true, name: true, type: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings.map(this.toResponseDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    id: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        room: { select: { id: true, name: true, type: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (userRole !== UserRole.super_admin && userHotelId !== booking.hotelId) {
      throw new NotFoundException('Booking not found');
    }

    return this.toResponseDto(booking);
  }

  async findByBookingNumber(bookingNumber: string): Promise<BookingResponseDto | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        room: { select: { id: true, name: true, type: true } },
      },
    });

    if (!booking) {
      return null;
    }

    return this.toResponseDto(booking);
  }

  async create(
    hotelId: string,
    dto: CreateBookingDto,
    userId: string | null,
    userRole: UserRole | null,
    userHotelId: string | null,
  ): Promise<BookingResponseDto> {
    // For admin users, verify hotel access
    if (userRole && userRole !== UserRole.super_admin && userHotelId !== hotelId) {
      throw new NotFoundException('Hotel not found');
    }

    // Validate room exists and belongs to hotel
    const room = await this.prisma.room.findFirst({
      where: { id: dto.roomId, hotelId, status: RoomStatus.active },
    });

    if (!room) {
      throw new BadRequestException('Room not found or not available');
    }

    // Validate dates
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkIn >= checkOut) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    if (checkIn < new Date(new Date().setHours(0, 0, 0, 0))) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    // Validate capacity
    const totalGuests = (dto.adults || 1) + (dto.children || 0);
    if (totalGuests > room.capacity) {
      throw new BadRequestException(
        `Room capacity (${room.capacity}) exceeded. Total guests: ${totalGuests}`,
      );
    }

    // Check availability
    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        roomId: dto.roomId,
        status: { in: [BookingStatus.pending, BookingStatus.confirmed] },
        OR: [
          {
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
          },
        ],
      },
    });

    if (conflictingBooking) {
      throw new BadRequestException('Room is not available for the selected dates');
    }

    // Calculate total price
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalPrice =
      parseFloat(room.basePrice instanceof Decimal ? room.basePrice.toString() : String(room.basePrice)) * nights;

    // Generate booking number
    const bookingNumber = this.generateBookingNumber();

    const booking = await this.prisma.booking.create({
      data: {
        hotelId,
        roomId: dto.roomId,
        bookingNumber,
        guestName: dto.guestName,
        guestEmail: dto.guestEmail.toLowerCase(),
        guestPhone: dto.guestPhone,
        checkIn,
        checkOut,
        adults: dto.adults || 1,
        children: dto.children || 0,
        totalPrice,
        currency: room.currency,
        status: BookingStatus.confirmed,
        specialRequests: dto.specialRequests,
        source: dto.source,
      },
      include: {
        room: { select: { id: true, name: true, type: true } },
      },
    });

    if (userId) {
      await this.createAuditLog(hotelId, userId, 'create_booking', 'booking', booking.id, {
        ...dto,
        totalPrice,
        bookingNumber,
      });
    }

    // Send booking confirmation emails
    await this.sendBookingConfirmationEmails(booking, hotelId);

    return this.toResponseDto(booking);
  }

  async update(
    id: string,
    dto: UpdateBookingDto,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (userRole !== UserRole.super_admin && userHotelId !== booking.hotelId) {
      throw new NotFoundException('Booking not found');
    }

    // Only owner, manager can update bookings
    if (
      userRole !== UserRole.super_admin &&
      userRole !== UserRole.hotel_owner &&
      userRole !== UserRole.hotel_manager
    ) {
      throw new ForbiddenException('Not authorized to update bookings');
    }

    // Can't update cancelled or completed bookings
    if (
      booking.status === BookingStatus.cancelled ||
      booking.status === BookingStatus.completed
    ) {
      throw new BadRequestException('Cannot update cancelled or completed bookings');
    }

    // If dates are being changed, recalculate price and check availability
    let totalPrice = booking.totalPrice;
    const checkIn = dto.checkIn ? new Date(dto.checkIn) : booking.checkIn;
    const checkOut = dto.checkOut ? new Date(dto.checkOut) : booking.checkOut;

    if (dto.checkIn || dto.checkOut) {
      if (checkIn >= checkOut) {
        throw new BadRequestException('Check-out must be after check-in');
      }

      // Check availability for new dates
      const conflictingBooking = await this.prisma.booking.findFirst({
        where: {
          roomId: booking.roomId,
          id: { not: id },
          status: { in: [BookingStatus.pending, BookingStatus.confirmed] },
          OR: [
            {
              checkIn: { lt: checkOut },
              checkOut: { gt: checkIn },
            },
          ],
        },
      });

      if (conflictingBooking) {
        throw new BadRequestException('Room is not available for the selected dates');
      }

      // Recalculate price
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );
      totalPrice = new Decimal(
        parseFloat(booking.room.basePrice instanceof Decimal ? booking.room.basePrice.toString() : String(booking.room.basePrice)) * nights,
      );
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        ...(dto.guestName && { guestName: dto.guestName }),
        ...(dto.guestEmail && { guestEmail: dto.guestEmail.toLowerCase() }),
        ...(dto.guestPhone !== undefined && { guestPhone: dto.guestPhone }),
        ...(dto.checkIn && { checkIn }),
        ...(dto.checkOut && { checkOut }),
        ...(dto.adults !== undefined && { adults: dto.adults }),
        ...(dto.children !== undefined && { children: dto.children }),
        ...(dto.specialRequests !== undefined && { specialRequests: dto.specialRequests }),
        totalPrice,
      },
      include: {
        room: { select: { id: true, name: true, type: true } },
      },
    });

    await this.createAuditLog(booking.hotelId, userId, 'update_booking', 'booking', id, dto);

    return this.toResponseDto(updatedBooking);
  }

  async updateStatus(
    id: string,
    dto: UpdateBookingStatusDto,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        room: { select: { id: true, name: true, type: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (userRole !== UserRole.super_admin && userHotelId !== booking.hotelId) {
      throw new NotFoundException('Booking not found');
    }

    // Validate status transitions
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.pending]: [BookingStatus.confirmed, BookingStatus.cancelled],
      [BookingStatus.confirmed]: [
        BookingStatus.completed,
        BookingStatus.cancelled,
        BookingStatus.no_show,
      ],
      [BookingStatus.completed]: [],
      [BookingStatus.cancelled]: [],
      [BookingStatus.no_show]: [],
    };

    if (!validTransitions[booking.status].includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${booking.status} to ${dto.status}`,
      );
    }

    const updateData: any = { status: dto.status };
    if (dto.status === BookingStatus.cancelled) {
      updateData.cancelledAt = new Date();
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        room: { select: { id: true, name: true, type: true } },
      },
    });

    await this.createAuditLog(
      booking.hotelId,
      userId,
      'update_booking_status',
      'booking',
      id,
      { fromStatus: booking.status, toStatus: dto.status },
    );

    // Send cancellation emails if booking was cancelled
    if (dto.status === BookingStatus.cancelled) {
      await this.sendBookingCancellationEmails(updatedBooking, booking.hotelId, userId);
    }

    return this.toResponseDto(updatedBooking);
  }

  async cancel(
    id: string,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<BookingResponseDto> {
    return this.updateStatus(
      id,
      { status: BookingStatus.cancelled },
      userId,
      userRole,
      userHotelId,
    );
  }

  async checkAvailability(
    hotelId: string,
    query: AvailabilityQueryDto,
  ): Promise<AvailabilityResponseDto> {
    const checkIn = new Date(query.checkIn);
    const checkOut = new Date(query.checkOut);

    if (checkIn >= checkOut) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Get all active rooms for the hotel
    const roomWhere: any = {
      hotelId,
      status: RoomStatus.active,
    };

    if (query.roomId) {
      roomWhere.id = query.roomId;
    }

    if (query.guests) {
      roomWhere.capacity = { gte: query.guests };
    }

    const rooms = await this.prisma.room.findMany({
      where: roomWhere,
      select: { id: true, name: true, type: true },
    });

    // Find rooms with conflicting bookings
    const bookedRoomIds = await this.prisma.booking.findMany({
      where: {
        hotelId,
        status: { in: [BookingStatus.pending, BookingStatus.confirmed] },
        OR: [
          {
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
          },
        ],
      },
      select: { roomId: true },
    });

    const bookedRoomIdSet = new Set(bookedRoomIds.map((b) => b.roomId));
    const availableRooms = rooms.filter((r) => !bookedRoomIdSet.has(r.id));

    return {
      available: availableRooms.length > 0,
      availableRooms,
      checkIn,
      checkOut,
      nights,
    };
  }

  private generateBookingNumber(): string {
    const prefix = 'BK';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private toResponseDto(booking: any): BookingResponseDto {
    return {
      id: booking.id,
      hotelId: booking.hotelId,
      roomId: booking.roomId,
      room: booking.room,
      bookingNumber: booking.bookingNumber,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      adults: booking.adults,
      children: booking.children,
      totalPrice:
        booking.totalPrice instanceof Decimal
          ? parseFloat(booking.totalPrice.toString())
          : booking.totalPrice,
      currency: booking.currency,
      status: booking.status,
      specialRequests: booking.specialRequests,
      source: booking.source,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      cancelledAt: booking.cancelledAt,
    };
  }

  private async sendBookingConfirmationEmails(booking: any, hotelId: string): Promise<void> {
    try {
      // Fetch hotel details for the email
      const hotel = await this.prisma.hotel.findUnique({
        where: { id: hotelId },
        select: {
          name: true,
          email: true,
          phone: true,
          address: true,
        },
      });

      if (!hotel) {
        this.logger.warn('Hotel not found for booking notification', { hotelId, bookingId: booking.id });
        return;
      }

      // Format address from JSON field
      const formatHotelAddress = (): string | undefined => {
        if (!hotel.address) return undefined;
        const addr = hotel.address as Record<string, unknown>;
        const parts = [
          addr.street,
          addr.city,
          addr.state,
          addr.postalCode,
          addr.country,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : undefined;
      };

      const notificationData: BookingNotificationData = {
        confirmationNumber: booking.bookingNumber,
        roomName: booking.room?.name || 'Room',
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
        totalPrice: booking.totalPrice instanceof Decimal
          ? parseFloat(booking.totalPrice.toString())
          : booking.totalPrice,
        currency: booking.currency,
        adults: booking.adults,
        children: booking.children,
        specialRequests: booking.specialRequests,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        hotelId,
        hotelName: hotel.name,
        hotelEmail: hotel.email || undefined,
        hotelPhone: hotel.phone || undefined,
        hotelAddress: formatHotelAddress(),
      };

      // Send confirmation to guest
      await this.notificationService.sendBookingConfirmationToGuest(notificationData);

      // Send notification to hotel if hotel email is configured
      if (hotel.email) {
        await this.notificationService.sendBookingConfirmationToHotel(notificationData, hotel.email);
      }

      this.logger.log('Booking confirmation emails sent', {
        bookingNumber: booking.bookingNumber,
        guestEmail: booking.guestEmail,
      });
    } catch (error) {
      this.logger.error('Failed to send booking confirmation emails', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bookingId: booking.id,
      });
      // Don't throw - email failure shouldn't fail the booking
    }
  }

  private async sendBookingCancellationEmails(
    booking: any,
    hotelId: string,
    cancelledByUserId: string,
  ): Promise<void> {
    try {
      // Fetch hotel and user details
      const [hotel, user] = await Promise.all([
        this.prisma.hotel.findUnique({
          where: { id: hotelId },
          select: { name: true, email: true },
        }),
        this.prisma.user.findUnique({
          where: { id: cancelledByUserId },
          select: { name: true, email: true },
        }),
      ]);

      if (!hotel) {
        this.logger.warn('Hotel not found for cancellation notification', { hotelId, bookingId: booking.id });
        return;
      }

      const notificationData: BookingNotificationData = {
        confirmationNumber: booking.bookingNumber,
        roomName: booking.room?.name || 'Room',
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
        totalPrice: booking.totalPrice instanceof Decimal
          ? parseFloat(booking.totalPrice.toString())
          : booking.totalPrice,
        currency: booking.currency,
        adults: booking.adults,
        children: booking.children,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        hotelId,
        hotelName: hotel.name,
        hotelEmail: hotel.email || undefined,
      };

      // Send cancellation notice to guest
      await this.notificationService.sendBookingCancellationToGuest(notificationData);

      // Send cancellation notice to hotel if email is configured
      if (hotel.email) {
        const cancelledBy = user?.name || user?.email || 'Staff member';
        await this.notificationService.sendBookingCancellationToHotel(
          notificationData,
          hotel.email,
          cancelledBy,
        );
      }

      this.logger.log('Booking cancellation emails sent', {
        bookingNumber: booking.bookingNumber,
        guestEmail: booking.guestEmail,
      });
    } catch (error) {
      this.logger.error('Failed to send booking cancellation emails', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bookingId: booking.id,
      });
      // Don't throw - email failure shouldn't fail the cancellation
    }
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
