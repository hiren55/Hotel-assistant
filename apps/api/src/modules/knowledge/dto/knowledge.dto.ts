import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { KnowledgeCategory } from '@prisma/client';

export class CreateKnowledgeDto {
  @ApiProperty({ description: 'Knowledge category', enum: KnowledgeCategory, example: 'general' })
  @IsEnum(KnowledgeCategory)
  category: KnowledgeCategory;

  @ApiProperty({ description: 'Knowledge key/title', example: 'check-in-time' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  key: string;

  @ApiProperty({ description: 'Knowledge value/content', example: 'Check-in time is 2:00 PM. Early check-in is available upon request and subject to availability.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  value: string;

  @ApiPropertyOptional({ description: 'Is entry active (default: true)', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Sort order for display', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;
}

export class UpdateKnowledgeDto {
  @ApiPropertyOptional({ description: 'Knowledge category', enum: KnowledgeCategory, example: 'general' })
  @IsOptional()
  @IsEnum(KnowledgeCategory)
  category?: KnowledgeCategory;

  @ApiPropertyOptional({ description: 'Knowledge key/title', example: 'wifi-password' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  key?: string;

  @ApiPropertyOptional({ description: 'Knowledge value/content', example: 'WiFi is available in all rooms. Network: GrandPalace-Guest, Password: Welcome@2026' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  value?: string;

  @ApiPropertyOptional({ description: 'Is entry active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order for display', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class KnowledgeQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category', enum: KnowledgeCategory, example: 'general' })
  @IsOptional()
  @IsEnum(KnowledgeCategory)
  category?: KnowledgeCategory;

  @ApiPropertyOptional({ description: 'Filter by active status', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search in key and value', example: 'check-in' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number (default: 1)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (default: 50)', example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}

export class KnowledgeResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001' })
  hotelId: string;

  @ApiProperty({ enum: KnowledgeCategory, example: 'general' })
  category: KnowledgeCategory;

  @ApiProperty({ example: 'check-in-time' })
  key: string;

  @ApiProperty({ example: 'Check-in time is 2:00 PM.' })
  value: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty({ example: '2026-02-28T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-02-28T00:00:00.000Z' })
  updatedAt: Date;
}

export class KnowledgeListResponseDto {
  @ApiProperty({ type: [KnowledgeResponseDto] })
  data: KnowledgeResponseDto[];

  @ApiProperty({ example: 30 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class BulkCreateKnowledgeDto {
  @ApiProperty({ type: [CreateKnowledgeDto] })
  entries: CreateKnowledgeDto[];
}
