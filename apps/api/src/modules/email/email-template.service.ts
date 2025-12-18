import { Injectable } from '@nestjs/common';

export type EmailTemplateType =
  | 'booking_confirmation_guest'
  | 'booking_confirmation_hotel'
  | 'booking_cancelled_guest'
  | 'booking_cancelled_hotel'
  | 'welcome_email'
  | 'password_reset'
  | 'email_verification';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface HotelBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customFooter?: string;
  senderName?: string;
  supportEmail?: string;
  websiteUrl?: string;
}

export interface TemplateRenderOptions {
  branding?: HotelBranding;
}

@Injectable()
export class EmailTemplateService {
  private readonly defaultPrimaryColor = '#3b82f6';
  private readonly defaultSecondaryColor = '#1f2937';

  render(
    template: EmailTemplateType,
    data: Record<string, unknown>,
    options?: TemplateRenderOptions,
  ): RenderedEmail {
    const branding = options?.branding || {};

    switch (template) {
      case 'booking_confirmation_guest':
        return this.renderBookingConfirmationGuest(data, branding);
      case 'booking_confirmation_hotel':
        return this.renderBookingConfirmationHotel(data, branding);
      case 'booking_cancelled_guest':
        return this.renderBookingCancelledGuest(data, branding);
      case 'booking_cancelled_hotel':
        return this.renderBookingCancelledHotel(data, branding);
      case 'welcome_email':
        return this.renderWelcomeEmail(data, branding);
      case 'password_reset':
        return this.renderPasswordReset(data, branding);
      case 'email_verification':
        return this.renderEmailVerification(data, branding);
      default:
        throw new Error(`Unknown email template: ${template}`);
    }
  }

  private sanitizeInput(input: unknown): string {
    if (input === null || input === undefined) return '';
    const str = String(input);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private baseLayout(
    content: string,
    hotelName?: string,
    branding?: HotelBranding,
  ): string {
    const primaryColor = branding?.primaryColor || this.defaultPrimaryColor;
    const secondaryColor = branding?.secondaryColor || this.defaultSecondaryColor;
    const displayName = branding?.senderName || hotelName || 'Hotel Assistant';
    const logoUrl = branding?.logoUrl;
    const customFooter = branding?.customFooter;
    const websiteUrl = branding?.websiteUrl;
    const supportEmail = branding?.supportEmail;

    const logoHtml = logoUrl
      ? `<img src="${this.sanitizeInput(logoUrl)}" alt="${this.sanitizeInput(displayName)}" style="max-width: 180px; max-height: 60px; margin-bottom: 12px;" />`
      : '';

    const footerContent = customFooter
      ? `<p style="margin-bottom: 8px;">${this.sanitizeInput(customFooter)}</p>`
      : '';

    const supportLine = supportEmail
      ? `<p style="margin-bottom: 8px;">Need help? Contact us at <a href="mailto:${this.sanitizeInput(supportEmail)}" style="color: ${primaryColor};">${this.sanitizeInput(supportEmail)}</a></p>`
      : '';

    const websiteLine = websiteUrl
      ? `<p style="margin-bottom: 8px;"><a href="${this.sanitizeInput(websiteUrl)}" style="color: ${primaryColor};">Visit our website</a></p>`
      : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: ${primaryColor};
      color: #ffffff;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 32px 24px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
    .button {
      display: inline-block;
      background-color: ${primaryColor};
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-label {
      color: #6b7280;
    }
    .detail-value {
      font-weight: 600;
    }
    .highlight-box {
      background-color: ${primaryColor}10;
      border-left: 4px solid ${primaryColor};
      padding: 16px;
      margin: 16px 0;
    }
    h2 {
      color: ${secondaryColor};
      margin-top: 0;
    }
    h3 {
      color: ${secondaryColor};
    }
    p {
      margin: 0 0 16px;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
      }
      .content {
        padding: 24px 16px !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoHtml}
      <h1>${this.sanitizeInput(displayName)}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      ${footerContent}
      ${supportLine}
      ${websiteLine}
      <p>This email was sent by ${this.sanitizeInput(displayName)}</p>
      <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private renderBookingConfirmationGuest(
    data: Record<string, unknown>,
    branding: HotelBranding,
  ): RenderedEmail {
    const {
      guestName,
      hotelName,
      roomName,
      checkIn,
      checkOut,
      totalPrice,
      currency,
      confirmationNumber,
      specialRequests,
      hotelAddress,
      hotelPhone,
      hotelEmail,
    } = data;

    const content = `
      <h2>Booking Confirmed!</h2>
      <p>Dear ${this.sanitizeInput(guestName)},</p>
      <p>Thank you for your reservation at ${this.sanitizeInput(hotelName)}. Your booking has been confirmed.</p>

      <div class="highlight-box">
        <strong>Confirmation Number:</strong> ${this.sanitizeInput(confirmationNumber)}
      </div>

      <h3>Booking Details</h3>
      <div class="detail-row">
        <span class="detail-label">Room</span>
        <span class="detail-value">${this.sanitizeInput(roomName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Check-in</span>
        <span class="detail-value">${this.sanitizeInput(checkIn)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Check-out</span>
        <span class="detail-value">${this.sanitizeInput(checkOut)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Total</span>
        <span class="detail-value">${this.sanitizeInput(currency) || '$'}${this.sanitizeInput(totalPrice)}</span>
      </div>
      ${specialRequests ? `
      <div class="detail-row">
        <span class="detail-label">Special Requests</span>
        <span class="detail-value">${this.sanitizeInput(specialRequests)}</span>
      </div>
      ` : ''}

      <h3>Hotel Information</h3>
      <p>
        ${this.sanitizeInput(hotelName)}<br>
        ${hotelAddress ? `${this.sanitizeInput(hotelAddress)}<br>` : ''}
        ${hotelPhone ? `Phone: ${this.sanitizeInput(hotelPhone)}<br>` : ''}
        ${hotelEmail ? `Email: ${this.sanitizeInput(hotelEmail)}` : ''}
      </p>

      <p>We look forward to welcoming you!</p>
    `;

    const text = `
Booking Confirmed!

Dear ${guestName},

Thank you for your reservation at ${hotelName}. Your booking has been confirmed.

Confirmation Number: ${confirmationNumber}

Booking Details:
- Room: ${roomName}
- Check-in: ${checkIn}
- Check-out: ${checkOut}
- Total: ${currency || '$'}${totalPrice}
${specialRequests ? `- Special Requests: ${specialRequests}` : ''}

We look forward to welcoming you!

${hotelName}
    `.trim();

    return {
      subject: `Booking Confirmed - ${hotelName}`,
      html: this.baseLayout(content, hotelName as string, branding),
      text,
    };
  }

  private renderBookingConfirmationHotel(
    data: Record<string, unknown>,
    branding: HotelBranding,
  ): RenderedEmail {
    const {
      hotelName,
      guestName,
      guestEmail,
      guestPhone,
      roomName,
      checkIn,
      checkOut,
      totalPrice,
      currency,
      confirmationNumber,
      specialRequests,
      adults,
      children,
    } = data;

    const content = `
      <h2>New Booking Received</h2>
      <p>A new booking has been made at your hotel.</p>

      <div class="highlight-box">
        <strong>Confirmation Number:</strong> ${this.sanitizeInput(confirmationNumber)}
      </div>

      <h3>Guest Information</h3>
      <div class="detail-row">
        <span class="detail-label">Name</span>
        <span class="detail-value">${this.sanitizeInput(guestName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Email</span>
        <span class="detail-value">${this.sanitizeInput(guestEmail)}</span>
      </div>
      ${guestPhone ? `
      <div class="detail-row">
        <span class="detail-label">Phone</span>
        <span class="detail-value">${this.sanitizeInput(guestPhone)}</span>
      </div>
      ` : ''}

      <h3>Booking Details</h3>
      <div class="detail-row">
        <span class="detail-label">Room</span>
        <span class="detail-value">${this.sanitizeInput(roomName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Check-in</span>
        <span class="detail-value">${this.sanitizeInput(checkIn)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Check-out</span>
        <span class="detail-value">${this.sanitizeInput(checkOut)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Guests</span>
        <span class="detail-value">${this.sanitizeInput(adults)} adults${children ? `, ${this.sanitizeInput(children)} children` : ''}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Total</span>
        <span class="detail-value">${this.sanitizeInput(currency) || '$'}${this.sanitizeInput(totalPrice)}</span>
      </div>
      ${specialRequests ? `
      <div class="highlight-box">
        <strong>Special Requests:</strong><br>${this.sanitizeInput(specialRequests)}
      </div>
      ` : ''}
    `;

    const text = `
New Booking Received

Confirmation Number: ${confirmationNumber}

Guest Information:
- Name: ${guestName}
- Email: ${guestEmail}
${guestPhone ? `- Phone: ${guestPhone}` : ''}

Booking Details:
- Room: ${roomName}
- Check-in: ${checkIn}
- Check-out: ${checkOut}
- Guests: ${adults} adults${children ? `, ${children} children` : ''}
- Total: ${currency || '$'}${totalPrice}
${specialRequests ? `\nSpecial Requests: ${specialRequests}` : ''}
    `.trim();

    return {
      subject: `New Booking - ${guestName} (${confirmationNumber})`,
      html: this.baseLayout(content, hotelName as string, branding),
      text,
    };
  }

  private renderBookingCancelledGuest(
    data: Record<string, unknown>,
    branding: HotelBranding,
  ): RenderedEmail {
    const {
      guestName,
      hotelName,
      roomName,
      checkIn,
      checkOut,
      confirmationNumber,
    } = data;

    const content = `
      <h2>Booking Cancelled</h2>
      <p>Dear ${this.sanitizeInput(guestName)},</p>
      <p>Your booking at ${this.sanitizeInput(hotelName)} has been cancelled.</p>

      <div class="highlight-box">
        <strong>Confirmation Number:</strong> ${this.sanitizeInput(confirmationNumber)}
      </div>

      <h3>Cancelled Booking Details</h3>
      <div class="detail-row">
        <span class="detail-label">Room</span>
        <span class="detail-value">${this.sanitizeInput(roomName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Check-in</span>
        <span class="detail-value">${this.sanitizeInput(checkIn)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Check-out</span>
        <span class="detail-value">${this.sanitizeInput(checkOut)}</span>
      </div>

      <p>If you have any questions about this cancellation, please contact the hotel directly.</p>
      <p>We hope to welcome you another time!</p>
    `;

    const text = `
Booking Cancelled

Dear ${guestName},

Your booking at ${hotelName} has been cancelled.

Confirmation Number: ${confirmationNumber}

Cancelled Booking Details:
- Room: ${roomName}
- Check-in: ${checkIn}
- Check-out: ${checkOut}

If you have any questions, please contact the hotel directly.
    `.trim();

    return {
      subject: `Booking Cancelled - ${hotelName}`,
      html: this.baseLayout(content, hotelName as string, branding),
      text,
    };
  }

  private renderBookingCancelledHotel(
    data: Record<string, unknown>,
    branding: HotelBranding,
  ): RenderedEmail {
    const {
      hotelName,
      guestName,
      guestEmail,
      roomName,
      checkIn,
      checkOut,
      confirmationNumber,
      cancelledBy,
      reason,
    } = data;

    const content = `
      <h2>Booking Cancelled</h2>
      <p>A booking has been cancelled at your hotel.</p>

      <div class="highlight-box">
        <strong>Confirmation Number:</strong> ${this.sanitizeInput(confirmationNumber)}
      </div>

      <h3>Guest Information</h3>
      <div class="detail-row">
        <span class="detail-label">Name</span>
        <span class="detail-value">${this.sanitizeInput(guestName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Email</span>
        <span class="detail-value">${this.sanitizeInput(guestEmail)}</span>
      </div>

      <h3>Cancelled Booking Details</h3>
      <div class="detail-row">
        <span class="detail-label">Room</span>
        <span class="detail-value">${this.sanitizeInput(roomName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Check-in</span>
        <span class="detail-value">${this.sanitizeInput(checkIn)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Check-out</span>
        <span class="detail-value">${this.sanitizeInput(checkOut)}</span>
      </div>
      ${cancelledBy ? `
      <div class="detail-row">
        <span class="detail-label">Cancelled By</span>
        <span class="detail-value">${this.sanitizeInput(cancelledBy)}</span>
      </div>
      ` : ''}
      ${reason ? `
      <div class="highlight-box">
        <strong>Reason:</strong><br>${this.sanitizeInput(reason)}
      </div>
      ` : ''}
    `;

    const text = `
Booking Cancelled

Confirmation Number: ${confirmationNumber}

Guest: ${guestName} (${guestEmail})

Cancelled Booking:
- Room: ${roomName}
- Check-in: ${checkIn}
- Check-out: ${checkOut}
${cancelledBy ? `- Cancelled By: ${cancelledBy}` : ''}
${reason ? `- Reason: ${reason}` : ''}
    `.trim();

    return {
      subject: `Booking Cancelled - ${guestName} (${confirmationNumber})`,
      html: this.baseLayout(content, hotelName as string, branding),
      text,
    };
  }

  private renderWelcomeEmail(
    data: Record<string, unknown>,
    branding: HotelBranding,
  ): RenderedEmail {
    const { name, hotelName, loginUrl } = data;

    const content = `
      <h2>Welcome to Hotel Assistant!</h2>
      <p>Hello ${this.sanitizeInput(name)},</p>
      <p>Thank you for registering ${hotelName ? `${this.sanitizeInput(hotelName)} ` : ''}with Hotel Assistant. We're excited to have you on board!</p>

      <h3>Getting Started</h3>
      <p>Here's what you can do next:</p>
      <ul>
        <li>Complete your hotel profile</li>
        <li>Add your rooms and pricing</li>
        <li>Set up your AI chatbot knowledge base</li>
        <li>Install the chat widget on your website</li>
      </ul>

      ${loginUrl ? `
      <p style="text-align: center;">
        <a href="${this.sanitizeInput(loginUrl)}" class="button">Go to Dashboard</a>
      </p>
      ` : ''}

      <p>If you need any help, our support team is here for you.</p>
    `;

    const text = `
Welcome to Hotel Assistant!

Hello ${name},

Thank you for registering${hotelName ? ` ${hotelName}` : ''} with Hotel Assistant. We're excited to have you on board!

Getting Started:
- Complete your hotel profile
- Add your rooms and pricing
- Set up your AI chatbot knowledge base
- Install the chat widget on your website

${loginUrl ? `Login here: ${loginUrl}` : ''}

If you need any help, our support team is here for you.
    `.trim();

    return {
      subject: 'Welcome to Hotel Assistant',
      html: this.baseLayout(content, undefined, branding),
      text,
    };
  }

  private renderPasswordReset(
    data: Record<string, unknown>,
    branding: HotelBranding,
  ): RenderedEmail {
    const { name, resetUrl, expiresIn } = data;

    const content = `
      <h2>Password Reset Request</h2>
      <p>Hello ${this.sanitizeInput(name)},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>

      <p style="text-align: center;">
        <a href="${this.sanitizeInput(resetUrl)}" class="button">Reset Password</a>
      </p>

      <p>This link will expire in ${this.sanitizeInput(expiresIn) || '1 hour'}.</p>

      <div class="highlight-box">
        <strong>Didn't request this?</strong><br>
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </div>

      <p style="font-size: 12px; color: #6b7280;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        ${this.sanitizeInput(resetUrl)}
      </p>
    `;

    const text = `
Password Reset Request

Hello ${name},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in ${expiresIn || '1 hour'}.

If you didn't request a password reset, you can safely ignore this email.
    `.trim();

    return {
      subject: 'Password Reset Request',
      html: this.baseLayout(content, undefined, branding),
      text,
    };
  }

  private renderEmailVerification(
    data: Record<string, unknown>,
    branding: HotelBranding,
  ): RenderedEmail {
    const { name, verifyUrl, expiresIn } = data;

    const content = `
      <h2>Verify Your Email</h2>
      <p>Hello ${this.sanitizeInput(name)},</p>
      <p>Please verify your email address by clicking the button below:</p>

      <p style="text-align: center;">
        <a href="${this.sanitizeInput(verifyUrl)}" class="button">Verify Email</a>
      </p>

      <p>This link will expire in ${this.sanitizeInput(expiresIn) || '24 hours'}.</p>

      <p style="font-size: 12px; color: #6b7280;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        ${this.sanitizeInput(verifyUrl)}
      </p>
    `;

    const text = `
Verify Your Email

Hello ${name},

Please verify your email address by clicking the link below:

${verifyUrl}

This link will expire in ${expiresIn || '24 hours'}.
    `.trim();

    return {
      subject: 'Verify Your Email Address',
      html: this.baseLayout(content, undefined, branding),
      text,
    };
  }
}
