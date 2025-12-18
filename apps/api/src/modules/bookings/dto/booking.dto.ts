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
  @ApiProperty({ description: 'Room ID' })
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ description: 'Guest full name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  guestName: string;

  @ApiProperty({ description: 'Guest email' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  guestEmail: string;

  @ApiPropertyOptional({ description: 'Guest phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  guestPhone?: string;

  @ApiProperty({ description: 'Check-in date (YYYY-MM-DD)' })
  @Type(() => Date)
  @IsDate()
  checkIn: Date;

  @ApiProperty({ description: 'Check-out date (YYYY-MM-DD)' })
  @Type(() => Date)
  @IsDate()
  checkOut: Date;

  @ApiPropertyOptional({ description: 'Number of adults (default: 1)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  adults?: number = 1;

  @ApiPropertyOptional({ description: 'Number of children (default: 0)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number = 0;

  @ApiPropertyOptional({ description: 'Special requests' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialRequests?: string;

  @ApiPropertyOptional({ description: 'Booking source', enum: BookingSource })
  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource = BookingSource.admin;
}

export class UpdateBookingDto {
  @ApiPropertyOptional({ description: 'Guest full name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  guestName?: string;

  @ApiPropertyOptional({ description: 'Guest email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  guestEmail?: string;

  @ApiPropertyOptional({ description: 'Guest phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  guestPhone?: string;

  @ApiPropertyOptional({ description: 'Check-in date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkIn?: Date;

  @ApiPropertyOptional({ description: 'Check-out date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkOut?: Date;

  @ApiPropertyOptional({ description: 'Number of adults' })
  @IsOptional()
  @IsInt()
  @Min(1)
  adults?: number;

  @ApiPropertyOptional({ description: 'Number of children' })
  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @ApiPropertyOptional({ description: 'Special requests' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialRequests?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({ description: 'Booking status', enum: BookingStatus })
  @IsEnum(BookingStatus)
  status: BookingStatus;
}

export class BookingQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ description: 'Filter by room ID' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Filter by guest email' })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional({ description: 'Filter from date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @ApiPropertyOptional({ description: 'Filter to date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;

  @ApiPropertyOptional({ description: 'Page number (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (default: 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order (asc/desc)' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class AvailabilityQueryDto {
  @ApiProperty({ description: 'Check-in date' })
  @Type(() => Date)
  @IsDate()
  checkIn: Date;

  @ApiProperty({ description: 'Check-out date' })
  @Type(() => Date)
  @IsDate()
  checkOut: Date;

  @ApiPropertyOptional({ description: 'Room ID to check' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Number of guests' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests?: number;
}

export class RoomSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;
}

export class BookingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  hotelId: string;

  @ApiProperty()
  roomId: string;

  @ApiPropertyOptional({ type: RoomSummaryDto })
  room?: RoomSummaryDto;

  @ApiProperty()
  bookingNumber: string;

  @ApiProperty()
  guestName: string;

  @ApiProperty()
  guestEmail: string;

  @ApiPropertyOptional()
  guestPhone?: string;

  @ApiProperty()
  checkIn: Date;

  @ApiProperty()
  checkOut: Date;

  @ApiProperty()
  adults: number;

  @ApiProperty()
  children: number;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiPropertyOptional()
  specialRequests?: string;

  @ApiProperty({ enum: BookingSource })
  source: BookingSource;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;
}

export class BookingListResponseDto {
  @ApiProperty({ type: [BookingResponseDto] })
  data: BookingResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class AvailabilityResponseDto {
  @ApiProperty()
  available: boolean;

  @ApiProperty({ type: [RoomSummaryDto] })
  availableRooms: RoomSummaryDto[];

  @ApiProperty()
  checkIn: Date;

  @ApiProperty()
  checkOut: Date;

  @ApiProperty()
  nights: number;
}
