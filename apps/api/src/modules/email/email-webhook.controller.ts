import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailStatus } from '@prisma/client';
import { createHmac } from 'crypto';

/**
 * Resend webhook event types
 * @see https://resend.com/docs/dashboard/webhooks/event-types
 */
interface ResendWebhookEvent {
  type:
    | 'email.sent'
    | 'email.delivered'
    | 'email.delivery_delayed'
    | 'email.complained'
    | 'email.bounced'
    | 'email.opened'
    | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Bounce-specific fields
    bounce?: {
      message: string;
      type?: string;
    };
    // Click-specific fields
    click?: {
      ipAddress: string;
      link: string;
      timestamp: string;
      userAgent: string;
    };
  };
}

@Controller('webhooks/email')
export class EmailWebhookController {
  private readonly logger = new Logger(EmailWebhookController.name);
  private readonly webhookSecret: string | undefined;

  constructor(
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('email.resend.webhookSecret');
    if (!this.webhookSecret) {
      this.logger.warn(
        'Resend webhook secret not configured - webhook signature verification disabled',
      );
    }
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  async handleResendWebhook(
    @Body() event: ResendWebhookEvent,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ): Promise<{ received: boolean }> {
    // Verify webhook signature if secret is configured
    if (this.webhookSecret) {
      const isValid = this.verifyWebhookSignature(
        event,
        svixId,
        svixTimestamp,
        svixSignature,
      );
      if (!isValid) {
        this.logger.warn('Invalid webhook signature', { svixId });
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    this.logger.log('Received Resend webhook', {
      type: event.type,
      emailId: event.data.email_id,
    });

    try {
      await this.processWebhookEvent(event);
    } catch (error) {
      this.logger.error('Error processing webhook', {
        type: event.type,
        emailId: event.data.email_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - we want to acknowledge receipt even if processing fails
    }

    return { received: true };
  }

  private verifyWebhookSignature(
    event: ResendWebhookEvent,
    svixId: string,
    svixTimestamp: string,
    svixSignature: string,
  ): boolean {
    if (!this.webhookSecret || !svixId || !svixTimestamp || !svixSignature) {
      return false;
    }

    try {
      // Verify timestamp is within tolerance (5 minutes)
      const timestamp = parseInt(svixTimestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > 300) {
        this.logger.warn('Webhook timestamp outside tolerance', {
          timestamp,
          now,
          diff: Math.abs(now - timestamp),
        });
        return false;
      }

      // Compute expected signature
      const payload = `${svixId}.${svixTimestamp}.${JSON.stringify(event)}`;
      const secretPart = this.webhookSecret.split('_')[1] || '';
      const secretBytes = Buffer.from(secretPart, 'base64');
      const expectedSignature = createHmac('sha256', secretBytes)
        .update(payload)
        .digest('base64');

      // Compare signatures (Svix sends multiple signatures separated by space)
      const signatures = svixSignature.split(' ').map((s) => s.split(',')[1]);
      return signatures.some((sig) => sig === expectedSignature);
    } catch (error) {
      this.logger.error('Error verifying webhook signature', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  private async processWebhookEvent(event: ResendWebhookEvent): Promise<void> {
    const messageId = event.data.email_id;

    switch (event.type) {
      case 'email.sent':
        // Email was accepted by Resend and is being sent
        // We already mark as sent when we get the API response, so this is optional
        this.logger.debug('Email sent event', { messageId });
        break;

      case 'email.delivered':
        await this.emailService.updateEmailStatusByMessageId(
          messageId,
          EmailStatus.delivered,
          { deliveredAt: new Date(event.created_at) },
        );
        this.logger.log('Email delivered', { messageId, to: event.data.to });
        break;

      case 'email.delivery_delayed':
        this.logger.warn('Email delivery delayed', {
          messageId,
          to: event.data.to,
        });
        // We don't change status for delays, just log it
        break;

      case 'email.bounced':
        await this.emailService.updateEmailStatusByMessageId(
          messageId,
          EmailStatus.bounced,
          {
            bouncedAt: new Date(event.created_at),
            bounceType: event.data.bounce?.type || 'unknown',
            errorMessage: event.data.bounce?.message,
          },
        );
        this.logger.warn('Email bounced', {
          messageId,
          to: event.data.to,
          bounceType: event.data.bounce?.type,
          message: event.data.bounce?.message,
        });
        break;

      case 'email.complained':
        await this.emailService.updateEmailStatusByMessageId(
          messageId,
          EmailStatus.complained,
          { complainedAt: new Date(event.created_at) },
        );
        this.logger.warn('Email complaint received', {
          messageId,
          to: event.data.to,
        });
        break;

      case 'email.opened':
        // Track opens if needed - not updating status as it's informational
        this.logger.debug('Email opened', { messageId, to: event.data.to });
        break;

      case 'email.clicked':
        // Track clicks if needed - not updating status as it's informational
        this.logger.debug('Email link clicked', {
          messageId,
          to: event.data.to,
          link: event.data.click?.link,
        });
        break;

      default:
        this.logger.warn('Unknown webhook event type', { type: event.type });
    }
  }
}
