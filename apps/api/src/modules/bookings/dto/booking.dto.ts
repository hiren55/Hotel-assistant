import {
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BookingStatus, BookingSource } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty({ description: 'Room ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ description: 'Guest full name', example: 'Rahul Sharma' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  guestName: string;

  @ApiProperty({ description: 'Guest email', example: 'rahul.sharma@email.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  guestEmail: string;

  @ApiPropertyOptional({ description: 'Guest phone number', example: '+91-9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  guestPhone?: string;

  @ApiProperty({ description: 'Check-in date (YYYY-MM-DD)', example: '2026-03-15' })
  @Type(() => Date)
  @IsDate()
  checkIn: Date;

  @ApiProperty({ description: 'Check-out date (YYYY-MM-DD)', example: '2026-03-18' })
  @Type(() => Date)
  @IsDate()
  checkOut: Date;

  @ApiPropertyOptional({ description: 'Number of adults (default: 1)', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  adults?: number = 1;

  @ApiPropertyOptional({ description: 'Number of children (default: 0)', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number = 0;

  @ApiPropertyOptional({ description: 'Special requests', example: 'Early check-in please. Need a baby crib.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialRequests?: string;

  @ApiPropertyOptional({ description: 'Booking source', enum: BookingSource, example: 'admin' })
  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource = BookingSource.admin;
}

export class UpdateBookingDto {
  @ApiPropertyOptional({ description: 'Guest full name', example: 'Rahul Sharma' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  guestName?: string;

  @ApiPropertyOptional({ description: 'Guest email', example: 'rahul.sharma@email.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  guestEmail?: string;

  @ApiPropertyOptional({ description: 'Guest phone number', example: '+91-9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  guestPhone?: string;

  @ApiPropertyOptional({ description: 'Check-in date', example: '2026-03-16' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkIn?: Date;

  @ApiPropertyOptional({ description: 'Check-out date', example: '2026-03-19' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkOut?: Date;

  @ApiPropertyOptional({ description: 'Number of adults', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  adults?: number;

  @ApiPropertyOptional({ description: 'Number of children', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @ApiPropertyOptional({ description: 'Special requests', example: 'Late check-out requested.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialRequests?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({ description: 'Booking status', enum: BookingStatus, example: 'confirmed' })
  @IsEnum(BookingStatus)
  status: BookingStatus;
}

export class BookingQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: BookingStatus, example: 'confirmed' })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ description: 'Filter by room ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Filter by guest email', example: 'rahul.sharma@email.com' })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional({ description: 'Filter from date', example: '2026-03-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @ApiPropertyOptional({ description: 'Filter to date', example: '2026-03-31' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;

  @ApiPropertyOptional({ description: 'Page number (default: 1)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (default: 10)', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort by field', example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Search by guest name or email', example: 'Hiren' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by sort order (asc/desc)', example: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class AvailabilityQueryDto {
  @ApiProperty({ description: 'Check-in date', example: '2026-03-15' })
  @Type(() => Date)
  @IsDate()
  checkIn: Date;

  @ApiProperty({ description: 'Check-out date', example: '2026-03-18' })
  @Type(() => Date)
  @IsDate()
  checkOut: Date;

  @ApiPropertyOptional({ description: 'Room ID to check', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Number of guests', example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests?: number;
}

export class RoomSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Deluxe Suite 101' })
  name: string;

  @ApiProperty({ example: 'deluxe' })
  type: string;
}

export class BookingResponseDto {
  @ApiProperty({ example: '770e8400-e29b-41d4-a716-446655440002' })
  id: string;

  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001' })
  hotelId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  roomId: string;

  @ApiPropertyOptional({ type: RoomSummaryDto })
  room?: RoomSummaryDto;

  @ApiProperty({ example: 'BK-2026-001' })
  bookingNumber: string;

  @ApiProperty({ example: 'Rahul Sharma' })
  guestName: string;

  @ApiProperty({ example: 'rahul.sharma@email.com' })
  guestEmail: string;

  @ApiPropertyOptional({ example: '+91-9876543210' })
  guestPhone?: string;

  @ApiProperty({ example: '2026-03-15T00:00:00.000Z' })
  checkIn: Date;

  @ApiProperty({ example: '2026-03-18T00:00:00.000Z' })
  checkOut: Date;

  @ApiProperty({ example: 2 })
  adults: number;

  @ApiProperty({ example: 1 })
  children: number;

  @ApiProperty({ example: 13500.00 })
  totalPrice: number;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ enum: BookingStatus, example: 'confirmed' })
  status: BookingStatus;

  @ApiPropertyOptional({ example: 'Early check-in please.' })
  specialRequests?: string;

  @ApiProperty({ enum: BookingSource, example: 'admin' })
  source: BookingSource;

  @ApiProperty({ example: '2026-02-28T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-02-28T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null })
  cancelledAt?: Date;
}

export class BookingListResponseDto {
  @ApiProperty({ type: [BookingResponseDto] })
  data: BookingResponseDto[];

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class AvailabilityResponseDto {
  @ApiProperty({ example: true })
  available: boolean;

  @ApiProperty({ type: [RoomSummaryDto] })
  availableRooms: RoomSummaryDto[];

  @ApiProperty({ example: '2026-03-15T00:00:00.000Z' })
  checkIn: Date;

  @ApiProperty({ example: '2026-03-18T00:00:00.000Z' })
  checkOut: Date;

  @ApiProperty({ example: 3 })
  nights: number;
}
