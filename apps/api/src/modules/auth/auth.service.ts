import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import { NotificationService } from '../email/notification.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  LoginDto,
  RegisterDto,
  RegisterHotelOwnerDto,
  RefreshTokenDto,
  AuthResponseDto,
  TokenResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  hotelId: string | null;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptRounds: number;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {
    this.bcryptRounds = this.configService.get<number>('security.bcryptRounds') || 12;
    this.accessTokenExpiresIn = this.configService.get<string>('jwt.accessTokenExpiresIn') || '15m';
    this.refreshTokenExpiresIn = this.configService.get<string>('jwt.refreshTokenExpiresIn') || '7d';
  }

  // ============================================
  // TOKEN GENERATION
  // ============================================

  private async generateTokens(user: {
    id: string;
    email: string;
    role: UserRole;
    hotelId: string | null;
  }): Promise<TokenResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      hotelId: user.hotelId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiresIn,
    });

    // Generate a secure random refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');

    // Parse refresh token expiry to milliseconds
    const refreshExpiresMs = this.parseExpiryToMs(this.refreshTokenExpiresIn);

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + refreshExpiresMs),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiryToSeconds(this.accessTokenExpiresIn),
      tokenType: 'Bearer',
    };
  }

  private parseExpiryToMs(expiry: string | undefined): number {
    if (!expiry) return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    const value = parseInt(match[1]!, 10);
    const unit = match[2]!;
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private parseExpiryToSeconds(expiry: string): number {
    return Math.floor(this.parseExpiryToMs(expiry) / 1000);
  }

  // ============================================
  // LOGIN
  // ============================================

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Find user by email
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
      include: { hotel: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.active) {
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create audit log
    await this.createAuditLog(user.hotelId, user.id, 'login', 'user', user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hotelId: user.hotelId,
        onboardingComplete: user.onboardingComplete,
      },
      tokens,
    };
  }

  // ============================================
  // REGISTER
  // ============================================

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // If hotelId is provided, verify hotel exists
    if (dto.hotelId) {
      const hotel = await this.prisma.hotel.findUnique({
        where: { id: dto.hotelId },
      });
      if (!hotel) {
        throw new BadRequestException('Hotel not found');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        role: dto.hotelId ? UserRole.hotel_staff : UserRole.hotel_owner,
        hotelId: dto.hotelId || null,
        status: UserStatus.active,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create audit log
    await this.createAuditLog(user.hotelId, user.id, 'register', 'user', user.id);

    // Send welcome email (non-blocking)
    this.sendWelcomeEmailAsync(user.name, user.email, user.hotelId);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hotelId: user.hotelId,
        onboardingComplete: user.onboardingComplete,
      },
      tokens,
    };
  }

  // ============================================
  // REGISTER HOTEL OWNER
  // ============================================

  async registerHotelOwner(dto: RegisterHotelOwnerDto): Promise<AuthResponseDto> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if hotel slug already exists
    const existingHotel = await this.prisma.hotel.findUnique({
      where: { slug: dto.hotelSlug.toLowerCase() },
    });

    if (existingHotel) {
      throw new ConflictException('Hotel slug already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    // Create hotel and user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create hotel
      const hotel = await tx.hotel.create({
        data: {
          name: dto.hotelName,
          slug: dto.hotelSlug.toLowerCase(),
          email: dto.email.toLowerCase(),
        },
      });

      // Create owner user (onboardingComplete = false for new hotel owners)
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          role: UserRole.hotel_owner,
          hotelId: hotel.id,
          status: UserStatus.active,
          onboardingComplete: false,
        },
      });

      return { hotel, user };
    });

    // Generate tokens
    const tokens = await this.generateTokens(result.user);

    // Create audit log
    await this.createAuditLog(
      result.hotel.id,
      result.user.id,
      'register_hotel_owner',
      'hotel',
      result.hotel.id,
    );

    // Send welcome email (non-blocking)
    this.sendWelcomeEmailAsync(
      result.user.name,
      result.user.email,
      result.user.hotelId,
      result.hotel.name,
    );

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        hotelId: result.user.hotelId,
        onboardingComplete: result.user.onboardingComplete,
      },
      tokens,
    };
  }

  // ============================================
  // REFRESH TOKEN
  // ============================================

  async refreshToken(dto: RefreshTokenDto): Promise<TokenResponseDto> {
    // Find refresh token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user || user.status !== UserStatus.active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Delete old refresh token (rotation)
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new tokens
    return this.generateTokens(user);
  }

  // ============================================
  // LOGOUT
  // ============================================

  async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        // Delete specific refresh token
        await this.prisma.refreshToken.deleteMany({
          where: {
            userId,
            token: refreshToken,
          },
        });
      } else {
        // Delete all refresh tokens for user (logout all devices)
        await this.prisma.refreshToken.deleteMany({
          where: { userId },
        });
      }

      // Create audit log
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) {
        await this.createAuditLog(user.hotelId, userId, 'logout', 'user', userId);
      }
    } catch (error) {
      // Log error but don't fail the logout
      this.logger.warn('Failed to clean up tokens or create audit log during logout', error);
    }
  }

  // ============================================
  // FORGOT PASSWORD
  // ============================================

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hashed token in database
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send password reset email
    const frontendUrl = this.configService.get<string>('frontend.adminUrl') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    try {
      await this.notificationService.sendPasswordResetEmail(
        user.name,
        user.email,
        resetUrl,
      );
    } catch (err: unknown) {
      this.logger.error('Failed to send password reset email', { email: user.email, error: err instanceof Error ? err.message : 'Unknown error' });
    }

    // Create audit log
    await this.createAuditLog(
      user.hotelId,
      user.id,
      'password_reset_requested',
      'user',
      user.id,
    );

    return { message: 'If the email exists, a reset link has been sent' };
  }

  // ============================================
  // RESET PASSWORD
  // ============================================

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    // Find valid reset token
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: resetToken.userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check password history
    const isPasswordReused = await this.checkPasswordHistory(user.id, dto.password);
    if (isPasswordReused) {
      throw new BadRequestException(
        'Cannot reuse any of your last 5 passwords. Please choose a different password.',
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    // Store current password in history before changing
    await this.addToPasswordHistory(user.id, user.passwordHash);

    // Update password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all refresh tokens (force re-login)
      this.prisma.refreshToken.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    // Create audit log
    await this.createAuditLog(
      user.hotelId,
      user.id,
      'password_reset_completed',
      'user',
      user.id,
    );

    return { message: 'Password reset successfully. Please login with your new password.' };
  }

  // ============================================
  // CHANGE PASSWORD
  // ============================================

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check password history (last 5 passwords)
    const isPasswordReused = await this.checkPasswordHistory(userId, dto.newPassword);
    if (isPasswordReused) {
      throw new BadRequestException(
        'Cannot reuse any of your last 5 passwords. Please choose a different password.',
      );
    }

    // Store current password hash in history before changing
    await this.addToPasswordHistory(userId, user.passwordHash);

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, this.bcryptRounds);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Create audit log
    await this.createAuditLog(
      user.hotelId,
      userId,
      'password_changed',
      'user',
      userId,
    );

    return { message: 'Password changed successfully' };
  }

  // ============================================
  // PASSWORD HISTORY
  // ============================================

  private async checkPasswordHistory(userId: string, newPassword: string): Promise<boolean> {
    try {
      // Get last 5 password hashes
      const passwordHistory = await this.prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Check if new password matches any historical password
      for (const history of passwordHistory) {
        const isMatch = await bcrypt.compare(newPassword, history.passwordHash);
        if (isMatch) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.warn('Password history check failed, allowing password change', error);
      return false;
    }
  }

  private async addToPasswordHistory(userId: string, passwordHash: string): Promise<void> {
    try {
      // Add to history
      await this.prisma.passwordHistory.create({
        data: {
          userId,
          passwordHash,
        },
      });

      // Keep only last 5 passwords
      const historyCount = await this.prisma.passwordHistory.count({
        where: { userId },
      });

      if (historyCount > 5) {
        // Delete oldest entries
        const oldestEntries = await this.prisma.passwordHistory.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          take: historyCount - 5,
        });

        await this.prisma.passwordHistory.deleteMany({
          where: {
            id: { in: oldestEntries.map((e) => e.id) },
          },
        });
      }
    } catch (error) {
      this.logger.warn('Failed to add password to history', error);
    }
  }

  // ============================================
  // USER VALIDATION (used by JWT Strategy)
  // ============================================

  async validateUser(payload: JwtPayload): Promise<any> {
    // Get user from database using JWT subject (user ID)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { hotel: true },
    });

    if (!user || user.status !== UserStatus.active) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hotelId: user.hotelId,
      onboardingComplete: user.onboardingComplete,
      hotel: user.hotel,
    };
  }

  // ============================================
  // EMAIL VERIFICATION
  // ============================================

  async requestEmailVerification(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');

    // Store hashed token
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        email: user.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email
    const frontendUrl = this.configService.get<string>('frontend.adminUrl') || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/auth/verify-email?token=${verificationToken}`;

    try {
      await this.notificationService.sendEmailVerification(
        user.name,
        user.email,
        verifyUrl,
      );
    } catch (err: unknown) {
      this.logger.error('Failed to send verification email', { email: user.email, error: err instanceof Error ? err.message : 'Unknown error' });
    }

    await this.createAuditLog(
      user.hotelId,
      user.id,
      'email_verification_requested',
      'user',
      user.id,
    );

    return { message: 'Verification email sent' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid verification token
    const verificationToken = await this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        verifiedAt: null,
      },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user status and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: { status: UserStatus.active },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { verifiedAt: new Date() },
      }),
    ]);

    // Create audit log
    const user = await this.prisma.user.findUnique({
      where: { id: verificationToken.userId },
      include: { hotel: true },
    });

    if (user) {
      await this.createAuditLog(
        user.hotelId,
        user.id,
        'email_verified',
        'user',
        user.id,
      );

      // Send welcome email now that email is verified
      this.sendWelcomeEmailAsync(user.name, user.email, user.hotelId, user.hotel?.name);
    }

    return { message: 'Email verified successfully' };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async getUserByEmail(email: string): Promise<{ exists: boolean; verified: boolean } | null> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    return {
      exists: true,
      verified: user.status !== UserStatus.pending_verification,
    };
  }

  private async createAuditLog(
    hotelId: string | null,
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          hotelId,
          userId,
          action,
          entityType,
          entityId,
        },
      });
    } catch (error) {
      // Don't fail the main operation if audit log fails
      console.error('Failed to create audit log:', error);
    }
  }

  private sendWelcomeEmailAsync(
    name: string,
    email: string,
    hotelId: string | null,
    hotelName?: string,
  ): void {
    const frontendUrl = this.configService.get<string>('frontend.adminUrl');
    const loginUrl = `${frontendUrl}/auth/login`;

    this.notificationService
      .sendWelcomeEmail(name, email, hotelId || undefined, hotelName, loginUrl)
      .catch((error) => {
        this.logger.error('Failed to send welcome email', {
          email,
          error: error.message,
        });
      });
  }

  /**
   * Clean up expired refresh tokens (can be called periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}

