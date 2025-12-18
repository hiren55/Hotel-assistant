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
  @ApiProperty({ description: 'Knowledge category', enum: KnowledgeCategory })
  @IsEnum(KnowledgeCategory)
  category: KnowledgeCategory;

  @ApiProperty({ description: 'Knowledge key/title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  key: string;

  @ApiProperty({ description: 'Knowledge value/content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  value: string;

  @ApiPropertyOptional({ description: 'Is entry active (default: true)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;
}

export class UpdateKnowledgeDto {
  @ApiPropertyOptional({ description: 'Knowledge category', enum: KnowledgeCategory })
  @IsOptional()
  @IsEnum(KnowledgeCategory)
  category?: KnowledgeCategory;

  @ApiPropertyOptional({ description: 'Knowledge key/title' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  key?: string;

  @ApiPropertyOptional({ description: 'Knowledge value/content' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  value?: string;

  @ApiPropertyOptional({ description: 'Is entry active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class KnowledgeQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsEnum(KnowledgeCategory)
  category?: KnowledgeCategory;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search in key and value' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (default: 50)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}

export class KnowledgeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  hotelId: string;

  @ApiProperty({ enum: KnowledgeCategory })
  category: KnowledgeCategory;

  @ApiProperty()
  key: string;

  @ApiProperty()
  value: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class KnowledgeListResponseDto {
  @ApiProperty({ type: [KnowledgeResponseDto] })
  data: KnowledgeResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class BulkCreateKnowledgeDto {
  @ApiProperty({ type: [CreateKnowledgeDto] })
  entries: CreateKnowledgeDto[];
}
