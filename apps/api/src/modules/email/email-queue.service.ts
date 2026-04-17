import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplateType, HotelBranding } from './email-template.service';
import Redis from 'ioredis';

export interface EmailJob {
  id: string;
  template: EmailTemplateType;
  to: string | string[];
  data: Record<string, unknown>;
  options?: {
    from?: string;
    replyTo?: string;
    hotelId?: string;
    branding?: HotelBranding;
  };
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  lastAttempt?: Date;
  error?: string;
}

interface RateLimitConfig {
  maxPerMinute: number;
  maxPerHour: number;
}

@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private redis: Redis | null = null;
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  private readonly QUEUE_KEY = 'email:queue';
  private readonly FAILED_KEY = 'email:failed';
  private readonly RATE_LIMIT_MINUTE_KEY = 'email:rate:minute';
  private readonly RATE_LIMIT_HOUR_KEY = 'email:rate:hour';
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = [1000, 5000, 30000]; // 1s, 5s, 30s

  private readonly rateLimits: RateLimitConfig;

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    this.rateLimits = {
      maxPerMinute: this.configService.get<number>('email.rateLimitPerMinute') || 30,
      maxPerHour: this.configService.get<number>('email.rateLimitPerHour') || 500,
    };
  }

  async onModuleInit() {
    try {
      const redisUrl = this.configService.get<string>('redis.url');
      if (redisUrl && redisUrl.trim() !== '') {
        this.redis = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1, // Don't retry infinitely so it can fail fast
          retryStrategy: () => null, // Disable retries
        });
        
        try {
          await this.redis.connect();
          this.logger.log('Email queue connected to Redis');
          this.startProcessing();
          
          this.redis.on('error', (err) => {
            if (this.redis) {
              this.logger.warn('Redis connection lost, switching to synchronous email processing. Error: ' + err.message);
              this.redis.disconnect();
              this.redis = null;
              this.stopProcessing();
            }
          });
        } catch (connectionError) {
          this.logger.warn('Failed to connect to Redis initially. Email queue disabled, sending synchronously.');
          this.redis.disconnect();
          this.redis = null;
        }
      } else {
        this.logger.warn('Redis not configured - email queue disabled, sending synchronously');
      }
    } catch (error) {
      this.logger.error('Failed to connect to Redis for email queue', error);
    }
  }

  async onModuleDestroy() {
    this.stopProcessing();
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async queue(
    template: EmailTemplateType,
    to: string | string[],
    data: Record<string, unknown>,
    options?: {
      from?: string;
      replyTo?: string;
      hotelId?: string;
      branding?: HotelBranding;
    },
  ): Promise<string> {
    const job: EmailJob = {
      id: this.generateId(),
      template,
      to,
      data,
      options,
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      createdAt: new Date(),
    };

    if (this.redis) {
      try {
        await this.redis.lpush(this.QUEUE_KEY, JSON.stringify(job));
        this.logger.debug(`Email queued: ${job.id}`, { template, to });
        return job.id;
      } catch (err) {
        this.logger.warn(`Redis push failed: ${err.message}. Treating as synchronous fallback.`);
        this.redis.disconnect();
        this.redis = null;
        await this.processJob(job);
        return job.id;
      }
    } else {
      // Fallback: send synchronously if Redis not available
      this.logger.debug('Sending email synchronously (no queue)', { template, to });
      await this.processJob(job);
      return job.id;
    }
  }

  private startProcessing() {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Check queue every second

    this.logger.log('Email queue processing started');
  }

  private stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      this.logger.log('Email queue processing stopped');
    }
  }

  private async processQueue() {
    if (this.isProcessing || !this.redis) return;

    this.isProcessing = true;

    try {
      // Check rate limits before processing
      const canSend = await this.checkRateLimits();
      if (!canSend) {
        this.logger.debug('Rate limit reached, skipping queue processing');
        this.isProcessing = false;
        return;
      }

      const jobJson = await this.redis.rpop(this.QUEUE_KEY);
      if (!jobJson) {
        this.isProcessing = false;
        return;
      }

      const job: EmailJob = JSON.parse(jobJson);
      await this.processJob(job);
    } catch (error) {
      this.logger.error('Error processing email queue', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async checkRateLimits(): Promise<boolean> {
    if (!this.redis) return true;

    const now = Date.now();
    const minuteKey = `${this.RATE_LIMIT_MINUTE_KEY}:${Math.floor(now / 60000)}`;
    const hourKey = `${this.RATE_LIMIT_HOUR_KEY}:${Math.floor(now / 3600000)}`;

    const [minuteCount, hourCount] = await Promise.all([
      this.redis.get(minuteKey),
      this.redis.get(hourKey),
    ]);

    const currentMinuteCount = parseInt(minuteCount || '0', 10);
    const currentHourCount = parseInt(hourCount || '0', 10);

    if (currentMinuteCount >= this.rateLimits.maxPerMinute) {
      this.logger.warn('Minute rate limit reached', {
        current: currentMinuteCount,
        limit: this.rateLimits.maxPerMinute,
      });
      return false;
    }

    if (currentHourCount >= this.rateLimits.maxPerHour) {
      this.logger.warn('Hour rate limit reached', {
        current: currentHourCount,
        limit: this.rateLimits.maxPerHour,
      });
      return false;
    }

    return true;
  }

  private async incrementRateLimitCounters(): Promise<void> {
    if (!this.redis) return;

    const now = Date.now();
    const minuteKey = `${this.RATE_LIMIT_MINUTE_KEY}:${Math.floor(now / 60000)}`;
    const hourKey = `${this.RATE_LIMIT_HOUR_KEY}:${Math.floor(now / 3600000)}`;

    const pipeline = this.redis.pipeline();
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, 120); // 2 minutes TTL
    pipeline.incr(hourKey);
    pipeline.expire(hourKey, 7200); // 2 hours TTL
    await pipeline.exec();
  }

  private async processJob(job: EmailJob) {
    job.attempts++;
    job.lastAttempt = new Date();

    try {
      const result = await this.emailService.sendTemplate(
        job.template,
        job.to,
        job.data,
        {
          from: job.options?.from,
          replyTo: job.options?.replyTo,
          hotelId: job.options?.hotelId,
          branding: job.options?.branding,
        },
      );

      if (result.success) {
        // Increment rate limit counters on successful send
        await this.incrementRateLimitCounters();

        this.logger.log(`Email sent: ${job.id}`, {
          messageId: result.messageId,
          template: job.template,
          to: job.to,
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.error = errorMessage;

      if (job.attempts < job.maxAttempts) {
        // Re-queue with delay
        const delay = this.RETRY_DELAY_MS[job.attempts - 1] || 30000;
        this.logger.warn(`Email failed, retrying in ${delay}ms: ${job.id}`, {
          attempt: job.attempts,
          error: errorMessage,
        });

        if (this.redis) {
          setTimeout(async () => {
            await this.redis!.lpush(this.QUEUE_KEY, JSON.stringify(job));
          }, delay);
        }
      } else {
        // Move to failed queue
        this.logger.error(`Email failed permanently: ${job.id}`, {
          attempts: job.attempts,
          error: errorMessage,
        });

        if (this.redis) {
          await this.redis.lpush(this.FAILED_KEY, JSON.stringify(job));
        }
      }
    }
  }

  async getQueueLength(): Promise<number> {
    if (!this.redis) return 0;
    return this.redis.llen(this.QUEUE_KEY);
  }

  async getFailedCount(): Promise<number> {
    if (!this.redis) return 0;
    return this.redis.llen(this.FAILED_KEY);
  }

  async getFailedJobs(limit = 100): Promise<EmailJob[]> {
    if (!this.redis) return [];
    const jobs = await this.redis.lrange(this.FAILED_KEY, 0, limit - 1);
    return jobs.map((j) => JSON.parse(j));
  }

  async retryFailedJob(jobId: string): Promise<boolean> {
    if (!this.redis) return false;

    const failedJobs = await this.redis.lrange(this.FAILED_KEY, 0, -1);
    for (const jobStr of failedJobs) {
      const job: EmailJob = JSON.parse(jobStr);
      if (job.id === jobId) {
        job.attempts = 0;
        job.error = undefined;
        await this.redis.lrem(this.FAILED_KEY, 1, jobStr);
        await this.redis.lpush(this.QUEUE_KEY, JSON.stringify(job));
        this.logger.log(`Retrying failed job: ${jobId}`);
        return true;
      }
    }
    return false;
  }

  async clearFailedJobs(): Promise<number> {
    if (!this.redis) return 0;
    const count = await this.redis.llen(this.FAILED_KEY);
    await this.redis.del(this.FAILED_KEY);
    this.logger.log(`Cleared ${count} failed email jobs`);
    return count;
  }

  async getRateLimitStatus(): Promise<{
    minuteCount: number;
    minuteLimit: number;
    hourCount: number;
    hourLimit: number;
  }> {
    if (!this.redis) {
      return {
        minuteCount: 0,
        minuteLimit: this.rateLimits.maxPerMinute,
        hourCount: 0,
        hourLimit: this.rateLimits.maxPerHour,
      };
    }

    const now = Date.now();
    const minuteKey = `${this.RATE_LIMIT_MINUTE_KEY}:${Math.floor(now / 60000)}`;
    const hourKey = `${this.RATE_LIMIT_HOUR_KEY}:${Math.floor(now / 3600000)}`;

    const [minuteCount, hourCount] = await Promise.all([
      this.redis.get(minuteKey),
      this.redis.get(hourKey),
    ]);

    return {
      minuteCount: parseInt(minuteCount || '0', 10),
      minuteLimit: this.rateLimits.maxPerMinute,
      hourCount: parseInt(hourCount || '0', 10),
      hourLimit: this.rateLimits.maxPerHour,
    };
  }

  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
