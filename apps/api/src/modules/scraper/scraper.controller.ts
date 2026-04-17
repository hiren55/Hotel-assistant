import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { ScraperService } from './scraper.service';
import { CreateScrapeJobDto, ScrapeJobResponseDto, DiscoverHotelDto } from './dto';
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

@ApiTags('scraper')
@Controller()
export class ScraperController {
    constructor(private readonly scraperService: ScraperService) { }

    @Post('hotels/:hotelId/scrape')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Scrape a hotel website and import knowledge' })
    @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
    @ApiResponse({ status: 201, description: 'Scrape job started', type: ScrapeJobResponseDto })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Hotel not found' })
    async scrapeWebsite(
        @Param('hotelId', ParseUUIDPipe) hotelId: string,
        @Body() dto: CreateScrapeJobDto,
        @CurrentUser() user: AuthUser,
    ): Promise<ScrapeJobResponseDto> {
        return this.scraperService.scrapeHotelWebsite(
            hotelId,
            dto,
            user.id,
            user.role,
            user.hotelId,
        );
    }

    @Get('hotels/:hotelId/scrape/status/:jobId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get scrape job status' })
    @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
    @ApiParam({ name: 'jobId', description: 'Scrape job ID' })
    @ApiResponse({ status: 200, description: 'Scrape job status', type: ScrapeJobResponseDto })
    @ApiResponse({ status: 404, description: 'Job not found' })
    async getJobStatus(
        @Param('hotelId', ParseUUIDPipe) hotelId: string,
        @Param('jobId', ParseUUIDPipe) jobId: string,
        @CurrentUser() user: AuthUser,
    ): Promise<ScrapeJobResponseDto> {
        return this.scraperService.getJobStatus(hotelId, jobId, user.role, user.hotelId);
    }

    @Get('hotels/:hotelId/scrape/history')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get scrape job history for a hotel' })
    @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
    @ApiResponse({ status: 200, description: 'Scrape job history', type: [ScrapeJobResponseDto] })
    async getJobHistory(
        @Param('hotelId', ParseUUIDPipe) hotelId: string,
        @CurrentUser() user: AuthUser,
    ): Promise<ScrapeJobResponseDto[]> {
        return this.scraperService.getJobHistory(hotelId, user.role, user.hotelId);
    }

    /**
     * Internal endpoint for the Python cron scheduler to get re-scrape targets.
     * No auth required — should only be accessible from internal network.
     */
    @Get('scraper/rescrape-targets')
    @ApiOperation({ summary: 'Get hotels that need re-scraping (internal)' })
    @ApiResponse({ status: 200, description: 'List of hotels to re-scrape' })
    async getRescrapeTargets() {
        return this.scraperService.getRescrapeTargets();
    }

    @Post('hotel-discovery')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Discover hotels via Google Search' })
    @ApiResponse({ status: 201, description: 'Hotel discovery results' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async discoverHotels(
        @Body() dto: DiscoverHotelDto,
    ) {
        return this.scraperService.discoverHotels(dto);
    }
}
