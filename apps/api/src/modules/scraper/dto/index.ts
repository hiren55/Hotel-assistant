import {
    IsString,
    IsUrl,
    IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export { DiscoverHotelDto } from './discover-hotel.dto';

export class CreateScrapeJobDto {
    @ApiProperty({ description: 'Hotel website URL to scrape', example: 'https://www.grandpalacehotel.com' })
    @IsString()
    @IsUrl({}, { message: 'Must be a valid URL' })
    url: string;

    @ApiPropertyOptional({ description: 'Hotel name (helps with Google Search)', example: 'Grand Palace Hotel Mumbai' })
    @IsOptional()
    @IsString()
    hotelName?: string;
}

export class ScrapeJobResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string;

    @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001' })
    hotelId: string;

    @ApiProperty({ example: 'https://www.grandpalacehotel.com' })
    url: string;

    @ApiProperty({ example: 'completed' })
    status: string;

    @ApiProperty({ example: 12 })
    pagesScraped: number;

    @ApiProperty({ example: 45 })
    entriesFound: number;

    @ApiPropertyOptional({ example: null })
    errorMessage?: string;

    @ApiPropertyOptional({ example: '2026-02-28T12:30:00.000Z' })
    completedAt?: Date;

    @ApiProperty({ example: '2026-02-28T12:00:00.000Z' })
    createdAt: Date;
}
