import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RoomStatus } from '@prisma/client';

export class CreateRoomDto {
  @ApiProperty({ description: 'Room name', example: 'Deluxe Suite 101' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Room type (e.g., standard, deluxe, suite)', example: 'deluxe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  type: string;

  @ApiPropertyOptional({ description: 'Room description', example: 'Spacious deluxe room with sea view, king-size bed, and private balcony.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Maximum guest capacity', example: 2 })
  @IsInt()
  @IsPositive()
  @Min(1)
  capacity: number;

  @ApiProperty({ description: 'Base price per night', example: 4500.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  basePrice: number;

  @ApiPropertyOptional({ description: 'Currency code (default: USD)', example: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'List of amenities', type: [String], example: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Room Service'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ description: 'List of image URLs', type: [String], example: ['https://example.com/room1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Sort order for display', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateRoomDto {
  @ApiPropertyOptional({ description: 'Room name', example: 'Premium Suite 201' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Room type', example: 'suite' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @ApiPropertyOptional({ description: 'Room description', example: 'Luxurious suite with panoramic city view.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Maximum guest capacity', example: 3 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Base price per night', example: 7500.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'List of amenities', type: [String], example: ['WiFi', 'AC', 'TV', 'Jacuzzi'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ description: 'List of image URLs', type: [String], example: ['https://example.com/suite1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Sort order for display', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateRoomStatusDto {
  @ApiProperty({ description: 'Room status', enum: RoomStatus, example: 'available' })
  @IsEnum(RoomStatus)
  status: RoomStatus;
}

export class RoomQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: RoomStatus, example: 'available' })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiPropertyOptional({ description: 'Filter by type', example: 'deluxe' })
  @IsOptional()
  @IsString()
  type?: string;

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

  @ApiPropertyOptional({ description: 'Sort by field', example: 'sortOrder' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'sortOrder';

  @ApiPropertyOptional({ description: 'Sort order (asc/desc)', example: 'asc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}

export class RoomResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001' })
  hotelId: string;

  @ApiProperty({ example: 'Deluxe Suite 101' })
  name: string;

  @ApiProperty({ example: 'deluxe' })
  type: string;

  @ApiPropertyOptional({ example: 'Spacious deluxe room with sea view.' })
  description?: string;

  @ApiProperty({ example: 2 })
  capacity: number;

  @ApiProperty({ example: 4500.00 })
  basePrice: number;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ type: [String], example: ['WiFi', 'AC', 'TV'] })
  amenities: string[];

  @ApiProperty({ type: [String], example: ['https://example.com/room1.jpg'] })
  images: string[];

  @ApiProperty({ enum: RoomStatus, example: 'available' })
  status: RoomStatus;

  @ApiProperty({ example: 1 })
  sortOrder: number;

  @ApiProperty({ example: '2026-02-28T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-02-28T00:00:00.000Z' })
  updatedAt: Date;
}

export class RoomListResponseDto {
  @ApiProperty({ type: [RoomResponseDto] })
  data: RoomResponseDto[];

  @ApiProperty({ example: 15 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 2 })
  totalPages: number;
}
