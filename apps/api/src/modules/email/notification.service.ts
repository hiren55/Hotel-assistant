import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from './email-queue.service';
import { HotelBranding } from './email-template.service';

export interface BookingNotificationData {
  // Booking info
  confirmationNumber: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  currency?: string;
  adults: number;
  children?: number;
  specialRequests?: string;

  // Guest info
  guestName: string;
  guestEmail: string;
  guestPhone?: string;

  // Hotel info
  hotelId: string;
  hotelName: string;
  hotelEmail?: string;
  hotelPhone?: string;
  hotelAddress?: string;
}

interface HotelBrandingSettings {
  email?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customFooter?: string;
    senderName?: string;
    supportEmail?: string;
    websiteUrl?: string;
  };
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private emailQueue: EmailQueueService,
    private prisma: PrismaService,
  ) {}

  private async getHotelBranding(hotelId: string): Promise<HotelBranding> {
    try {
      const hotel = await this.prisma.hotel.findUnique({
        where: { id: hotelId },
        select: { branding: true, name: true, email: true },
      });

      if (!hotel) {
        return {};
      }

      const brandingData = hotel.branding as HotelBrandingSettings | null;
      const emailBranding = brandingData?.email || {};

      return {
        logoUrl: emailBranding.logoUrl,
        primaryColor: emailBranding.primaryColor,
        secondaryColor: emailBranding.secondaryColor,
        customFooter: emailBranding.customFooter,
        senderName: emailBranding.senderName || hotel.name,
        supportEmail: emailBranding.supportEmail || hotel.email,
        websiteUrl: emailBranding.websiteUrl,
      };
    } catch (error) {
      this.logger.warn('Failed to fetch hotel branding', {
        hotelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {};
    }
  }

  async sendBookingConfirmationToGuest(data: BookingNotificationData): Promise<string> {
    this.logger.log('Sending booking confirmation to guest', {
      confirmationNumber: data.confirmationNumber,
      guestEmail: data.guestEmail,
    });

    const branding = await this.getHotelBranding(data.hotelId);

    return this.emailQueue.queue(
      'booking_confirmation_guest',
      data.guestEmail,
      {
        guestName: data.guestName,
        hotelName: data.hotelName,
        roomName: data.roomName,
        checkIn: this.formatDate(data.checkIn),
        checkOut: this.formatDate(data.checkOut),
        totalPrice: data.totalPrice,
        currency: data.currency || '$',
        confirmationNumber: data.confirmationNumber,
        specialRequests: data.specialRequests,
        hotelAddress: data.hotelAddress,
        hotelPhone: data.hotelPhone,
        hotelEmail: data.hotelEmail,
      },
      {
        hotelId: data.hotelId,
        branding,
      },
    );
  }

  async sendBookingConfirmationToHotel(
    data: BookingNotificationData,
    hotelEmail: string,
  ): Promise<string> {
    this.logger.log('Sending booking notification to hotel', {
      confirmationNumber: data.confirmationNumber,
      hotelEmail,
    });

    const branding = await this.getHotelBranding(data.hotelId);

    return this.emailQueue.queue(
      'booking_confirmation_hotel',
      hotelEmail,
      {
        hotelName: data.hotelName,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        roomName: data.roomName,
        checkIn: this.formatDate(data.checkIn),
        checkOut: this.formatDate(data.checkOut),
        totalPrice: data.totalPrice,
        currency: data.currency || '$',
        confirmationNumber: data.confirmationNumber,
        specialRequests: data.specialRequests,
        adults: data.adults,
        children: data.children,
      },
      {
        hotelId: data.hotelId,
        branding,
      },
    );
  }

  async sendBookingCancellationToGuest(data: BookingNotificationData): Promise<string> {
    this.logger.log('Sending cancellation notice to guest', {
      confirmationNumber: data.confirmationNumber,
      guestEmail: data.guestEmail,
    });

    const branding = await this.getHotelBranding(data.hotelId);

    return this.emailQueue.queue(
      'booking_cancelled_guest',
      data.guestEmail,
      {
        guestName: data.guestName,
        hotelName: data.hotelName,
        roomName: data.roomName,
        checkIn: this.formatDate(data.checkIn),
        checkOut: this.formatDate(data.checkOut),
        confirmationNumber: data.confirmationNumber,
      },
      {
        hotelId: data.hotelId,
        branding,
      },
    );
  }

  async sendBookingCancellationToHotel(
    data: BookingNotificationData,
    hotelEmail: string,
    cancelledBy?: string,
    reason?: string,
  ): Promise<string> {
    this.logger.log('Sending cancellation notice to hotel', {
      confirmationNumber: data.confirmationNumber,
      hotelEmail,
    });

    const branding = await this.getHotelBranding(data.hotelId);

    return this.emailQueue.queue(
      'booking_cancelled_hotel',
      hotelEmail,
      {
        hotelName: data.hotelName,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        roomName: data.roomName,
        checkIn: this.formatDate(data.checkIn),
        checkOut: this.formatDate(data.checkOut),
        confirmationNumber: data.confirmationNumber,
        cancelledBy,
        reason,
      },
      {
        hotelId: data.hotelId,
        branding,
      },
    );
  }

  async sendWelcomeEmail(
    name: string,
    email: string,
    hotelId?: string,
    hotelName?: string,
    loginUrl?: string,
  ): Promise<string> {
    this.logger.log('Sending welcome email', { email, name });

    const branding = hotelId ? await this.getHotelBranding(hotelId) : {};

    return this.emailQueue.queue(
      'welcome_email',
      email,
      {
        name,
        hotelName,
        loginUrl,
      },
      {
        hotelId,
        branding,
      },
    );
  }

  async sendPasswordResetEmail(
    name: string,
    email: string,
    resetUrl: string,
    hotelId?: string,
    expiresIn?: string,
  ): Promise<string> {
    this.logger.log('Sending password reset email', { email });

    const branding = hotelId ? await this.getHotelBranding(hotelId) : {};

    return this.emailQueue.queue(
      'password_reset',
      email,
      {
        name,
        resetUrl,
        expiresIn,
      },
      {
        hotelId,
        branding,
      },
    );
  }

  async sendEmailVerification(
    name: string,
    email: string,
    verifyUrl: string,
    hotelId?: string,
    expiresIn?: string,
  ): Promise<string> {
    this.logger.log('Sending email verification', { email });

    const branding = hotelId ? await this.getHotelBranding(hotelId) : {};

    return this.emailQueue.queue(
      'email_verification',
      email,
      {
        name,
        verifyUrl,
        expiresIn,
      },
      {
        hotelId,
        branding,
      },
    );
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }
}
