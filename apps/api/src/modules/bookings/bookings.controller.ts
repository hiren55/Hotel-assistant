import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  hotelId: string | null;
}

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('hotels/:hotelId/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'List bookings for a hotel' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiResponse({ status: 200, description: 'List of bookings', type: BookingListResponseDto })
  async findAll(
    @Param('hotelId', ParseUUIDPipe) hotelId: string,
    @Query() query: BookingQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingListResponseDto> {
    return this.bookingsService.findAll(hotelId, query, user.role, user.hotelId);
  }

  @Post()
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiResponse({ status: 201, description: 'Booking created', type: BookingResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error or room not available' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Param('hotelId', ParseUUIDPipe) hotelId: string,
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.create(hotelId, dto, user.id, user.role, user.hotelId);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Check room availability' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiResponse({ status: 200, description: 'Availability information', type: AvailabilityResponseDto })
  async checkAvailability(
    @Param('hotelId', ParseUUIDPipe) hotelId: string,
    @Query() query: AvailabilityQueryDto,
  ): Promise<AvailabilityResponseDto> {
    return this.bookingsService.checkAvailability(hotelId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking details', type: BookingResponseDto })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.findOne(id, user.role, user.hotelId);
  }

  @Put(':id')
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Update booking details' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking updated', type: BookingResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.update(id, dto, user.id, user.role, user.hotelId);
  }

  @Put(':id/status')
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Update booking status' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking status updated', type: BookingResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.updateStatus(id, dto, user.id, user.role, user.hotelId);
  }

  @Delete(':id')
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking cancelled', type: BookingResponseDto })
  @ApiResponse({ status: 400, description: 'Booking cannot be cancelled' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.cancel(id, user.id, user.role, user.hotelId);
  }
}
