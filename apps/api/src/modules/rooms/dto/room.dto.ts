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
  @ApiProperty({ description: 'Room name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Room type (e.g., standard, deluxe, suite)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  type: string;

  @ApiPropertyOptional({ description: 'Room description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Maximum guest capacity' })
  @IsInt()
  @IsPositive()
  @Min(1)
  capacity: number;

  @ApiProperty({ description: 'Base price per night' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  basePrice: number;

  @ApiPropertyOptional({ description: 'Currency code (default: USD)' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'List of amenities', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ description: 'List of image URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateRoomDto {
  @ApiPropertyOptional({ description: 'Room name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Room type' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @ApiPropertyOptional({ description: 'Room description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Maximum guest capacity' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Base price per night' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'List of amenities', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ description: 'List of image URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateRoomStatusDto {
  @ApiProperty({ description: 'Room status', enum: RoomStatus })
  @IsEnum(RoomStatus)
  status: RoomStatus;
}

export class RoomQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiPropertyOptional({ description: 'Filter by type' })
  @IsOptional()
  @IsString()
  type?: string;

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
  sortBy?: string = 'sortOrder';

  @ApiPropertyOptional({ description: 'Sort order (asc/desc)' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}

export class RoomResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  hotelId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  capacity: number;

  @ApiProperty()
  basePrice: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ type: [String] })
  amenities: string[];

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty({ enum: RoomStatus })
  status: RoomStatus;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class RoomListResponseDto {
  @ApiProperty({ type: [RoomResponseDto] })
  data: RoomResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
