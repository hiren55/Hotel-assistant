import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Post,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { EmailService } from './email.service';
import { EmailQueueService } from './email-queue.service';

@ApiTags('Email Stats')
@Controller('api/v1/email')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmailStatsController {
  constructor(
    private emailService: EmailService,
    private emailQueueService: EmailQueueService,
  ) {}

  @Get('stats')
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'Get global email statistics (super admin only)' })
  async getGlobalStats() {
    const [stats, queueLength, failedCount, rateLimitStatus] = await Promise.all([
      this.emailService.getEmailStats(),
      this.emailQueueService.getQueueLength(),
      this.emailQueueService.getFailedCount(),
      this.emailQueueService.getRateLimitStatus(),
    ]);

    return {
      ...stats,
      queue: {
        pending: queueLength,
        failed: failedCount,
      },
      rateLimit: rateLimitStatus,
    };
  }

  @Get('stats/:hotelId')
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Get email statistics for a hotel' })
  async getHotelStats(@Param('hotelId') hotelId: string) {
    const stats = await this.emailService.getEmailStats(hotelId);
    return stats;
  }

  @Get('recent')
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'Get recent emails (super admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentEmails(@Query('limit') limit?: string) {
    const emails = await this.emailService.getRecentEmails(
      undefined,
      limit ? parseInt(limit, 10) : 50,
    );
    return { data: emails };
  }

  @Get('recent/:hotelId')
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Get recent emails for a hotel' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHotelRecentEmails(
    @Param('hotelId') hotelId: string,
    @Query('limit') limit?: string,
  ) {
    const emails = await this.emailService.getRecentEmails(
      hotelId,
      limit ? parseInt(limit, 10) : 50,
    );
    return { data: emails };
  }

  @Get('queue/status')
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'Get email queue status' })
  async getQueueStatus() {
    const [queueLength, failedCount, rateLimitStatus] = await Promise.all([
      this.emailQueueService.getQueueLength(),
      this.emailQueueService.getFailedCount(),
      this.emailQueueService.getRateLimitStatus(),
    ]);

    return {
      queue: {
        pending: queueLength,
        failed: failedCount,
      },
      rateLimit: rateLimitStatus,
    };
  }

  @Get('queue/failed')
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'Get failed email jobs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFailedJobs(@Query('limit') limit?: string) {
    const jobs = await this.emailQueueService.getFailedJobs(
      limit ? parseInt(limit, 10) : 100,
    );
    return { data: jobs };
  }

  @Post('queue/retry/:jobId')
  @Roles(UserRole.super_admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed email job' })
  async retryFailedJob(@Param('jobId') jobId: string) {
    const success = await this.emailQueueService.retryFailedJob(jobId);
    return { success, jobId };
  }

  @Delete('queue/failed')
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'Clear all failed email jobs' })
  async clearFailedJobs() {
    const count = await this.emailQueueService.clearFailedJobs();
    return { cleared: count };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check email service health' })
  async healthCheck() {
    const isEnabled = this.emailService.isServiceEnabled();
    const [queueLength, rateLimitStatus] = await Promise.all([
      this.emailQueueService.getQueueLength(),
      this.emailQueueService.getRateLimitStatus(),
    ]);

    const isRateLimited =
      rateLimitStatus.minuteCount >= rateLimitStatus.minuteLimit ||
      rateLimitStatus.hourCount >= rateLimitStatus.hourLimit;

    return {
      status: isEnabled && !isRateLimited ? 'healthy' : 'degraded',
      enabled: isEnabled,
      rateLimited: isRateLimited,
      queueBacklog: queueLength,
    };
  }
}
