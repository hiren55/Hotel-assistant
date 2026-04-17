import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EmailTemplateService,
  EmailTemplateType,
  HotelBranding,
} from './email-template.service';
import { EmailStatus } from '@prisma/client';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  hotelId?: string;
  template?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  logId?: string;
}

export interface SendTemplateOptions {
  from?: string;
  replyTo?: string;
  hotelId?: string;
  branding?: HotelBranding;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly defaultFrom: string;
  private readonly isEnabled: boolean;
  private transporter: nodemailer.Transporter | null = null;
  private readonly isSmtp: boolean;

  constructor(
    private configService: ConfigService,
    private templateService: EmailTemplateService,
    private prisma: PrismaService,
  ) {
    const provider = this.configService.get<string>('email.provider') || 'resend';
    this.apiKey = this.configService.get<string>('email.resend.apiKey') || '';
    this.defaultFrom =
      this.configService.get<string>('email.from') || 'noreply@hotelassistant.com';
    
    // Check SMTP config
    const smtpUser = this.configService.get<string>('email.smtp.user');
    const smtpPass = this.configService.get<string>('email.smtp.pass');
    
    this.isSmtp = provider === 'smtp' || !!(smtpUser && smtpPass);
    this.isEnabled = this.isSmtp || !!this.apiKey;

    if (this.isSmtp && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('email.smtp.host') || 'smtp.gmail.com',
        port: this.configService.get<number>('email.smtp.port') || 587,
        secure: this.configService.get<boolean>('email.smtp.secure') || false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log('Email service initialized with SMTP (Nodemailer)');
    } else if (this.apiKey) {
      this.logger.log('Email service initialized with Resend API');
    } else {
      this.logger.warn('Email service is disabled - no API key or SMTP configured');
    }
  }

  async send(options: SendEmailOptions): Promise<EmailResult> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const cleanSubject = options.subject.replace(/\r?\n|\r/g, ' ').trim();

    // Create email log entry
    let logId: string | undefined;
    if (options.hotelId || options.template) {
      try {
        const log = await this.prisma.emailLog.create({
          data: {
            hotelId: options.hotelId,
            template: options.template || 'custom',
            recipient: recipients.join(', '),
            subject: cleanSubject.substring(0, 500),
            status: EmailStatus.queued,
          },
        });
        logId = log.id;
      } catch (error) {
        this.logger.warn('Failed to create email log', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (!this.isEnabled) {
      this.logger.warn('Email not sent - service disabled', {
        to: options.to,
        subject: cleanSubject,
      });
      await this.updateEmailLog(logId, {
        status: EmailStatus.failed,
        errorMessage: 'Email service disabled',
      });
      return { success: false, error: 'Email service disabled', logId };
    }

    try {
      let messageId = '';
      
      if (this.isSmtp && this.transporter) {
        // Send using Nodemailer
        const info = await this.transporter.sendMail({
          from: options.from || this.defaultFrom,
          to: recipients,
          subject: cleanSubject,
          html: options.html,
          text: options.text,
          replyTo: options.replyTo,
        });
        messageId = info.messageId;
      } else {
        // Send using Resend API fallback
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            from: options.from || this.defaultFrom,
            to: recipients,
            subject: cleanSubject,
            html: options.html,
            text: options.text,
            reply_to: options.replyTo,
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
          const errorMessage = (errorData.message as string) || `HTTP ${response.status}`;
          this.logger.error('Failed to send email', {
            status: response.status,
            error: errorData,
            to: options.to,
            subject: cleanSubject,
          });
          await this.updateEmailLog(logId, {
            status: EmailStatus.failed,
            errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
            logId,
          };
        }

        const data = (await response.json()) as { id: string };
        messageId = data.id;
      }

      this.logger.log('Email sent successfully', {
        messageId: messageId,
        to: options.to,
        subject: cleanSubject,
      });

      await this.updateEmailLog(logId, {
        status: EmailStatus.sent,
        messageId: messageId,
        sentAt: new Date(),
      });

      return { success: true, messageId: messageId, logId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Email send error', {
        error: errorMessage,
        to: options.to,
        subject: cleanSubject,
      });
      await this.updateEmailLog(logId, {
        status: EmailStatus.failed,
        errorMessage,
      });
      return { success: false, error: errorMessage, logId };
    }
  }

  async sendTemplate(
    template: EmailTemplateType,
    to: string | string[],
    data: Record<string, unknown>,
    options?: SendTemplateOptions,
  ): Promise<EmailResult> {
    const rendered = this.templateService.render(template, data, {
      branding: options?.branding,
    });

    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      from: options?.from,
      replyTo: options?.replyTo,
      hotelId: options?.hotelId,
      template,
    });
  }

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  private async updateEmailLog(
    logId: string | undefined,
    data: {
      status?: EmailStatus;
      messageId?: string;
      errorMessage?: string;
      sentAt?: Date;
      deliveredAt?: Date;
      bouncedAt?: Date;
      bounceType?: string;
    },
  ): Promise<void> {
    if (!logId) return;

    try {
      await this.prisma.emailLog.update({
        where: { id: logId },
        data,
      });
    } catch (error) {
      this.logger.warn('Failed to update email log', {
        logId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateEmailStatusByMessageId(
    messageId: string,
    status: EmailStatus,
    additionalData?: {
      deliveredAt?: Date;
      bouncedAt?: Date;
      bounceType?: string;
      complainedAt?: Date;
      errorMessage?: string;
    },
  ): Promise<boolean> {
    try {
      await this.prisma.emailLog.update({
        where: { messageId },
        data: {
          status,
          ...additionalData,
        },
      });
      return true;
    } catch (error) {
      this.logger.warn('Failed to update email status by messageId', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async getEmailStats(hotelId?: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    bounced: number;
    failed: number;
    complained: number;
  }> {
    const where = hotelId ? { hotelId } : {};

    const [total, sent, delivered, bounced, failed, complained] =
      await Promise.all([
        this.prisma.emailLog.count({ where }),
        this.prisma.emailLog.count({
          where: { ...where, status: EmailStatus.sent },
        }),
        this.prisma.emailLog.count({
          where: { ...where, status: EmailStatus.delivered },
        }),
        this.prisma.emailLog.count({
          where: { ...where, status: EmailStatus.bounced },
        }),
        this.prisma.emailLog.count({
          where: { ...where, status: EmailStatus.failed },
        }),
        this.prisma.emailLog.count({
          where: { ...where, status: EmailStatus.complained },
        }),
      ]);

    return { total, sent, delivered, bounced, failed, complained };
  }

  async getRecentEmails(
    hotelId?: string,
    limit = 50,
  ): Promise<
    {
      id: string;
      template: string;
      recipient: string;
      subject: string;
      status: EmailStatus;
      createdAt: Date;
      sentAt: Date | null;
    }[]
  > {
    return this.prisma.emailLog.findMany({
      where: hotelId ? { hotelId } : {},
      select: {
        id: true,
        template: true,
        recipient: true,
        subject: true,
        status: true,
        createdAt: true,
        sentAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
