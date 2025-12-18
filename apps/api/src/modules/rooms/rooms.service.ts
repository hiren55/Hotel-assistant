import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRoomDto,
  UpdateRoomDto,
  UpdateRoomStatusDto,
  RoomQueryDto,
  RoomResponseDto,
  RoomListResponseDto,
} from './dto';
import { UserRole, RoomStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    hotelId: string,
    query: RoomQueryDto,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<RoomListResponseDto> {
    // Verify access
    if (userRole !== UserRole.super_admin && userHotelId !== hotelId) {
      throw new NotFoundException('Hotel not found');
    }

    const { page = 1, limit = 10, status, type, sortBy = 'sortOrder', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [rooms, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.room.count({ where }),
    ]);

    return {
      data: rooms.map(this.toResponseDto),
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
  ): Promise<RoomResponseDto> {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Verify access
    if (userRole !== UserRole.super_admin && userHotelId !== room.hotelId) {
      throw new NotFoundException('Room not found');
    }

    return this.toResponseDto(room);
  }

  async create(
    hotelId: string,
    dto: CreateRoomDto,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<RoomResponseDto> {
    // Only owner, manager, or super admin can create rooms
    if (
      userRole !== UserRole.super_admin &&
      userRole !== UserRole.hotel_owner &&
      userRole !== UserRole.hotel_manager
    ) {
      throw new ForbiddenException('Not authorized to create rooms');
    }

    if (userRole !== UserRole.super_admin && userHotelId !== hotelId) {
      throw new NotFoundException('Hotel not found');
    }

    // Verify hotel exists
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const room = await this.prisma.room.create({
      data: {
        hotelId,
        name: dto.name,
        type: dto.type,
        description: dto.description,
        capacity: dto.capacity,
        basePrice: dto.basePrice,
        currency: dto.currency || 'USD',
        amenities: dto.amenities || [],
        images: dto.images || [],
        sortOrder: dto.sortOrder || 0,
        status: RoomStatus.active,
      },
    });

    await this.createAuditLog(hotelId, userId, 'create_room', 'room', room.id, dto);

    return this.toResponseDto(room);
  }

  async update(
    id: string,
    dto: UpdateRoomDto,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<RoomResponseDto> {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Verify access
    if (userRole !== UserRole.super_admin && userHotelId !== room.hotelId) {
      throw new NotFoundException('Room not found');
    }

    // Only owner, manager, or super admin can update rooms
    if (
      userRole !== UserRole.super_admin &&
      userRole !== UserRole.hotel_owner &&
      userRole !== UserRole.hotel_manager
    ) {
      throw new ForbiddenException('Not authorized to update rooms');
    }

    const updatedRoom = await this.prisma.room.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.amenities !== undefined && { amenities: dto.amenities }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    await this.createAuditLog(room.hotelId, userId, 'update_room', 'room', id, dto);

    return this.toResponseDto(updatedRoom);
  }

  async updateStatus(
    id: string,
    dto: UpdateRoomStatusDto,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<RoomResponseDto> {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Verify access
    if (userRole !== UserRole.super_admin && userHotelId !== room.hotelId) {
      throw new NotFoundException('Room not found');
    }

    // Only owner, manager, or super admin can update room status
    if (
      userRole !== UserRole.super_admin &&
      userRole !== UserRole.hotel_owner &&
      userRole !== UserRole.hotel_manager
    ) {
      throw new ForbiddenException('Not authorized to update room status');
    }

    const updatedRoom = await this.prisma.room.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.createAuditLog(room.hotelId, userId, 'update_room_status', 'room', id, dto);

    return this.toResponseDto(updatedRoom);
  }

  async delete(
    id: string,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<void> {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { bookings: { where: { status: { in: ['pending', 'confirmed'] } } } },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Verify access
    if (userRole !== UserRole.super_admin && userHotelId !== room.hotelId) {
      throw new NotFoundException('Room not found');
    }

    // Only owner or super admin can delete rooms
    if (userRole !== UserRole.super_admin && userRole !== UserRole.hotel_owner) {
      throw new ForbiddenException('Not authorized to delete rooms');
    }

    // Check for active bookings
    if (room.bookings.length > 0) {
      throw new BadRequestException(
        'Cannot delete room with active or pending bookings',
      );
    }

    await this.prisma.room.delete({
      where: { id },
    });

    await this.createAuditLog(room.hotelId, userId, 'delete_room', 'room', id);
  }

  async findActiveByHotel(hotelId: string): Promise<RoomResponseDto[]> {
    const rooms = await this.prisma.room.findMany({
      where: {
        hotelId,
        status: RoomStatus.active,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return rooms.map(this.toResponseDto);
  }

  private toResponseDto(room: any): RoomResponseDto {
    return {
      id: room.id,
      hotelId: room.hotelId,
      name: room.name,
      type: room.type,
      description: room.description,
      capacity: room.capacity,
      basePrice: room.basePrice instanceof Decimal
        ? parseFloat(room.basePrice.toString())
        : room.basePrice,
      currency: room.currency,
      amenities: room.amenities as string[],
      images: room.images as string[],
      status: room.status,
      sortOrder: room.sortOrder,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
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
