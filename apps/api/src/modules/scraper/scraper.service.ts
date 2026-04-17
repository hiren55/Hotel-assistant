import {
    Injectable,
    Logger,
    NotFoundException,
    InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { CreateScrapeJobDto, ScrapeJobResponseDto, DiscoverHotelDto } from './dto';
import { UserRole, KnowledgeCategory } from '@prisma/client';

interface ScraperApiResponse {
    job_id: string;
    status: string;
    hotel_id: string;
    url: string;
    pages_scraped: number;
    entries_found: number;
    entries: Array<{
        category: string;
        key: string;
        value: string;
    }>;
    error_message?: string;
}

export interface DiscoveryApiResult {
    name: string;
    website: string;
    image: string | null;
    source: string;
    snippet: string;
}

// ScrapeStatus string literals (until Prisma client is regenerated)
const SCRAPE_STATUS = {
    pending: 'pending',
    crawling: 'crawling',
    searching: 'searching',
    extracting: 'extracting',
    importing: 'importing',
    completed: 'completed',
    failed: 'failed',
} as const;

@Injectable()
export class ScraperService {
    private readonly logger = new Logger(ScraperService.name);
    private readonly scraperBaseUrl: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly knowledgeService: KnowledgeService,
    ) {
        this.scraperBaseUrl = process.env.SCRAPER_SERVICE_URL || 'http://127.0.0.1:3003';
    }

    /**
     * Trigger a scrape job for a hotel website.
     * Calls the Python Crawl4AI microservice and imports the results.
     */
    async scrapeHotelWebsite(
        hotelId: string,
        dto: CreateScrapeJobDto,
        userId: string,
        userRole: UserRole,
        userHotelId: string | null,
    ): Promise<ScrapeJobResponseDto> {
        // Verify hotel exists and user has access
        if (userRole !== UserRole.super_admin && userHotelId !== hotelId) {
            throw new NotFoundException('Hotel not found');
        }

        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { id: true, name: true },
        });

        if (!hotel) {
            throw new NotFoundException('Hotel not found');
        }

        // Create scrape job record
        const job = await (this.prisma as any).scrapeJob.create({
            data: {
                hotelId,
                url: dto.url,
                status: SCRAPE_STATUS.pending,
            },
        });

        // Call Python scraper service (async — don't await the whole thing)
        this.runScrapeInBackground(job.id, hotelId, dto.url, hotel.name, userId, userRole, userHotelId);

        return this.toResponseDto(job);
    }

    /**
     * Runs the full scrape pipeline in the background.
     */
    private async runScrapeInBackground(
        jobId: string,
        hotelId: string,
        url: string,
        hotelName: string,
        userId: string,
        userRole: UserRole,
        userHotelId: string | null,
    ): Promise<void> {
        try {
            // Update status to crawling
            await (this.prisma as any).scrapeJob.update({
                where: { id: jobId },
                data: { status: SCRAPE_STATUS.crawling },
            });

            // MOCK BYPASS: Check if USE_MOCK_AI is enabled to skip Python & Gemini rate limits
            if (process.env.USE_MOCK_AI === 'true') {
                this.logger.log(`[${jobId}] 🤖 USE_MOCK_AI enabled. Bypassing real Python scraper to use demo JSON data!`);
                await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate UI loading

                await (this.prisma as any).scrapeJob.update({
                    where: { id: jobId },
                    data: { status: SCRAPE_STATUS.extracting },
                });
                await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulate UI loading

                await (this.prisma as any).scrapeJob.update({
                    where: { id: jobId },
                    data: { status: SCRAPE_STATUS.importing },
                });

                const fs = require('fs');
                const path = require('path');
                const mockDataPath = path.join(process.cwd(), 'src', 'modules', 'scraper', 'mock-hotel-data.json');
                
                let knowledgeEntries = [];
                if (fs.existsSync(mockDataPath)) {
                    knowledgeEntries = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
                }

                if (knowledgeEntries.length > 0) {
                    await this.knowledgeService.bulkCreate(
                        hotelId,
                        { entries: knowledgeEntries },
                        userId,
                        userRole,
                        userHotelId,
                    );
                    this.logger.log(`[${jobId}] 🤖 Imported ${knowledgeEntries.length} MOCK knowledge entries from JSON.`);
                }

                // 🤖 EXTRA DEMO MOCKING: Populate Dashboard with Rooms and Bookings so it looks awesome
                const prismaRaw = this.prisma as any;
                
                // Check if rooms exist, if not create them
                const roomCount = await prismaRaw.room.count({ where: { hotelId } });
                if (roomCount === 0) {
                    this.logger.log(`[${jobId}] 🤖 Generating Mock Rooms...`);
                    const deluxeRoom = await prismaRaw.room.create({
                        data: { hotelId, name: 'Deluxe Ocean View', type: 'Deluxe', capacity: 2, basePrice: 8500, currency: 'INR', status: 'active' }
                    });
                    const suiteRoom = await prismaRaw.room.create({
                        data: { hotelId, name: 'Presidential Suite', type: 'Suite', capacity: 4, basePrice: 25000, currency: 'INR', status: 'active' }
                    });

                    this.logger.log(`[${jobId}] 🤖 Generating Mock Bookings...`);
                    const today = new Date();
                    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                    const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);
                    
                    await prismaRaw.booking.createMany({
                        data: [
                            { hotelId, roomId: deluxeRoom.id, bookingNumber: `BK${Math.floor(Math.random() * 10000)}`, guestName: 'Aarav Sharma', guestEmail: 'aarav@example.com', checkIn: today, checkOut: tomorrow, adults: 2, totalPrice: 8500, status: 'confirmed', source: 'widget' },
                            { hotelId, roomId: suiteRoom.id, bookingNumber: `BK${Math.floor(Math.random() * 10000)}`, guestName: 'Priya Patel', guestEmail: 'priya@example.com', checkIn: tomorrow, checkOut: nextWeek, adults: 2, totalPrice: 150000, status: 'confirmed', source: 'admin' },
                            { hotelId, roomId: deluxeRoom.id, bookingNumber: `BK${Math.floor(Math.random() * 10000)}`, guestName: 'Rohan Gupta', guestEmail: 'rohan@example.com', checkIn: new Date(today.getTime() - 86400000 * 3), checkOut: today, adults: 1, totalPrice: 25500, status: 'completed', source: 'widget' },
                        ]
                    });

                    await prismaRaw.conversation.createMany({
                        data: [
                            { hotelId, sessionId: 'mock-session-1', visitorId: 'vis-1', messageCount: 5, metadata: {} },
                            { hotelId, sessionId: 'mock-session-2', visitorId: 'vis-2', messageCount: 12, metadata: {} }
                        ]
                    });
                    this.logger.log(`[${jobId}] 🤖 Mock Bookings & Conversations injected for Dashboard WOW factor!`);
                }

                await (this.prisma as any).scrapeJob.update({
                    where: { id: jobId },
                    data: {
                        status: SCRAPE_STATUS.completed,
                        pagesScraped: 50,
                        entriesFound: knowledgeEntries.length,
                        completedAt: new Date(),
                    },
                });

                this.logger.log(`[${jobId}] ✅ MOCK Scrape job completed successfully`);
                return;
            }

            this.logger.log(`[${jobId}] Calling scraper service for ${url}`);

            // Call Python scraper (synchronous endpoint — waits for completion)
            const response = await fetch(`${this.scraperBaseUrl}/scrape/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    hotel_id: hotelId,
                    hotel_name: hotelName,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Scraper service error (${response.status}): ${errorText}`);
            }

            const result = (await response.json()) as ScraperApiResponse;

            if (result.status === 'failed') {
                throw new Error(result.error_message || 'Scrape failed');
            }

            // Update job with scrape results
            await (this.prisma as any).scrapeJob.update({
                where: { id: jobId },
                data: {
                    status: SCRAPE_STATUS.importing,
                    pagesScraped: result.pages_scraped,
                    entriesFound: result.entries_found,
                },
            });

            this.logger.log(
                `[${jobId}] Scraper returned ${result.entries_found} entries from ${result.pages_scraped} pages`,
            );

            // Import entries into HotelKnowledge via bulk upsert
            if (result.entries && result.entries.length > 0) {
                const validCategories = Object.values(KnowledgeCategory);

                const knowledgeEntries = result.entries
                    .filter((entry) => validCategories.includes(entry.category as KnowledgeCategory))
                    .map((entry) => ({
                        category: entry.category as KnowledgeCategory,
                        key: entry.key,
                        value: entry.value,
                    }));

                if (knowledgeEntries.length > 0) {
                    await this.knowledgeService.bulkCreate(
                        hotelId,
                        { entries: knowledgeEntries },
                        userId,
                        userRole,
                        userHotelId,
                    );

                    this.logger.log(`[${jobId}] Imported ${knowledgeEntries.length} knowledge entries`);
                }
            }

            // Mark job as completed
            await (this.prisma as any).scrapeJob.update({
                where: { id: jobId },
                data: {
                    status: SCRAPE_STATUS.completed,
                    completedAt: new Date(),
                },
            });

            this.logger.log(`[${jobId}] ✅ Scrape job completed successfully`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`[${jobId}] ❌ Scrape job failed: ${errorMessage}`);

            await (this.prisma as any).scrapeJob
                .update({
                    where: { id: jobId },
                    data: {
                        status: SCRAPE_STATUS.failed,
                        errorMessage,
                    },
                })
                .catch((e: Error) => this.logger.error(`Failed to update job status: ${e.message}`));
        }
    }

    /**
     * Get the status of a scrape job.
     */
    async getJobStatus(
        hotelId: string,
        jobId: string,
        userRole: UserRole,
        userHotelId: string | null,
    ): Promise<ScrapeJobResponseDto> {
        if (userRole !== UserRole.super_admin && userHotelId !== hotelId) {
            throw new NotFoundException('Hotel not found');
        }

        const job = await (this.prisma as any).scrapeJob.findFirst({
            where: { id: jobId, hotelId },
        });

        if (!job) {
            throw new NotFoundException('Scrape job not found');
        }

        return this.toResponseDto(job);
    }

    /**
     * Get all scrape jobs for a hotel.
     */
    async getJobHistory(
        hotelId: string,
        userRole: UserRole,
        userHotelId: string | null,
    ): Promise<ScrapeJobResponseDto[]> {
        if (userRole !== UserRole.super_admin && userHotelId !== hotelId) {
            throw new NotFoundException('Hotel not found');
        }

        const jobs = await (this.prisma as any).scrapeJob.findMany({
            where: { hotelId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        return jobs.map(this.toResponseDto);
    }

    /**
     * Get all hotels that have been previously scraped (for weekly cron re-scrape).
     */
    async getRescrapeTargets(): Promise<Array<{ hotelId: string; url: string }>> {
        const latestJobs = await (this.prisma as any).scrapeJob.findMany({
            where: { status: SCRAPE_STATUS.completed },
            orderBy: { createdAt: 'desc' },
            distinct: ['hotelId'],
            select: { hotelId: true, url: true },
        });

        return latestJobs;
    }

    /**
     * Discover hotels via Google Search.
     * Proxies to the Python scraper's /discover endpoint.
     */
    async discoverHotels(
        dto: DiscoverHotelDto,
    ): Promise<DiscoveryApiResult[]> {
        // MOCK BYPASS: Check if USE_MOCK_AI is enabled
        if (process.env.USE_MOCK_AI === 'true') {
            this.logger.log(`🤖 USE_MOCK_AI enabled. Bypassing real hotel discovery for "${dto.hotelName}".`);
            return [
                {
                    name: dto.hotelName || "The Grand Mock Hotel",
                    website: "https://www.example.com/mock-hotel",
                    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop",
                    source: "Official",
                    snippet: "A luxurious mock hotel perfect for testing the onboarding flow."
                },
                {
                    name: `${dto.hotelName} Resort & Spa` || "The Grand Mock Resort",
                    website: "https://www.booking.com/mock",
                    image: null,
                    source: "Booking.com",
                    snippet: "Book this amazing mock hotel on Booking.com today."
                }
            ];
        }

        try {
            this.logger.log(`Discovering hotels: "${dto.hotelName}" in "${dto.city}"`);

            const response = await fetch(`${this.scraperBaseUrl}/discover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hotel_name: dto.hotelName,
                    city: dto.city,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Scraper discovery error (${response.status}): ${errorText}`);
            }

            const results = (await response.json()) as DiscoveryApiResult[];
            this.logger.log(`Discovered ${results.length} hotel results`);

            return results;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Hotel discovery failed: ${errorMessage}`);
            throw new InternalServerErrorException(`Discovery service error: ${errorMessage}`);
        }
    }

    /**
     * Update hotel profile with discovered/scraped data.
     */
    async updateHotelProfile(
        hotelId: string,
        data: { name?: string; website?: string; description?: string },
        userRole: UserRole,
        userHotelId: string | null,
    ): Promise<void> {
        if (userRole !== UserRole.super_admin && userHotelId !== hotelId) {
            throw new NotFoundException('Hotel not found');
        }

        await this.prisma.hotel.update({
            where: { id: hotelId },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.website && { website: data.website }),
                ...(data.description && { description: data.description }),
            },
        });
    }

    private toResponseDto(job: any): ScrapeJobResponseDto {
        return {
            id: job.id,
            hotelId: job.hotelId,
            url: job.url,
            status: job.status,
            pagesScraped: job.pagesScraped,
            entriesFound: job.entriesFound,
            errorMessage: job.errorMessage,
            completedAt: job.completedAt,
            createdAt: job.createdAt,
        };
    }
}
