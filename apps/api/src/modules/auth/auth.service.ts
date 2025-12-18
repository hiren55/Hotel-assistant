import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { UserRole, UserStatus } from '@prisma/client';
import { NotificationService } from '../email/notification.service';
import {
  LoginDto,
  RegisterDto,
  RegisterHotelOwnerDto,
  RefreshTokenDto,
  AuthResponseDto,
  TokenResponseDto,
  ForgotPasswordDto,
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

export interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  aud: string;
  role: string;
  iat: number;
  exp: number;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Authenticate with Supabase
    const { user: supabaseUser, session, error } = await this.supabase.signInWithPassword(
      dto.email.toLowerCase(),
      dto.password,
    );

    if (error || !supabaseUser || !session) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get or create local user record
    let user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
      include: { hotel: true },
    });

    if (!user) {
      // User exists in Supabase but not locally - this shouldn't happen normally
      // but handle gracefully by creating local record
      const userName = String(supabaseUser.user_metadata?.name || dto.email.split('@')[0] || 'User');
      const newUser = await this.prisma.user.create({
        data: {
          id: supabaseUser.id, // Use Supabase user ID
          email: dto.email.toLowerCase(),
          passwordHash: 'supabase-managed', // Password is managed by Supabase
          name: userName,
          role: UserRole.hotel_owner,
          status: UserStatus.active,
        },
        include: { hotel: true },
      });
      user = newUser;
    }

    // If user was pending verification and successfully logged in via Supabase,
    // their email has been verified - update status to active
    if (user.status === UserStatus.pending_verification) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.active },
      });
      user.status = UserStatus.active;
      this.logger.log(`User ${user.email} email verified, status updated to active`);
    }

    if (user.status !== UserStatus.active) {
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create audit log
    await this.createAuditLog(user.hotelId, user.id, 'login', 'user', user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hotelId: user.hotelId,
      },
      tokens: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in || 3600,
        tokenType: 'Bearer',
      },
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email already exists locally
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

    // Register with Supabase
    const { user: supabaseUser, session, error } = await this.supabase.signUp(
      dto.email.toLowerCase(),
      dto.password,
      {
        name: dto.name,
        role: dto.hotelId ? UserRole.hotel_staff : UserRole.hotel_owner,
      },
    );

    if (error) {
      if (error.message.includes('already registered')) {
        throw new ConflictException('Email already registered');
      }
      throw new BadRequestException(error.message);
    }

    if (!supabaseUser) {
      throw new BadRequestException('Failed to create user');
    }

    // Create local user record
    const user = await this.prisma.user.create({
      data: {
        id: supabaseUser.id, // Use Supabase user ID
        email: dto.email.toLowerCase(),
        passwordHash: 'supabase-managed',
        name: dto.name,
        role: dto.hotelId ? UserRole.hotel_staff : UserRole.hotel_owner,
        hotelId: dto.hotelId || null,
        status: UserStatus.active,
      },
    });

    // Create audit log
    await this.createAuditLog(user.hotelId, user.id, 'register', 'user', user.id);

    // Send welcome email (non-blocking)
    this.sendWelcomeEmailAsync(user.name, user.email, user.hotelId);

    // If session is null, email confirmation is required
    if (!session) {
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          hotelId: user.hotelId,
        },
        tokens: {
          accessToken: '',
          refreshToken: '',
          expiresIn: 0,
          tokenType: 'Bearer',
        },
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hotelId: user.hotelId,
      },
      tokens: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in || 3600,
        tokenType: 'Bearer',
      },
    };
  }

  async registerHotelOwner(dto: RegisterHotelOwnerDto): Promise<AuthResponseDto> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      // If user exists but is pending verification, allow re-registration
      // (user may have not received verification email)
      if (existingUser.status !== UserStatus.pending_verification) {
        throw new ConflictException('Email already registered');
      }
      // Update the existing pending user instead of creating new
      this.logger.log(`Updating existing pending verification user: ${existingUser.email}`);
    }

    // Check if hotel slug already exists (but not owned by this user)
    const existingHotel = await this.prisma.hotel.findUnique({
      where: { slug: dto.hotelSlug.toLowerCase() },
    });

    if (existingHotel && (!existingUser || existingUser.hotelId !== existingHotel.id)) {
      throw new ConflictException('Hotel slug already taken');
    }

    let supabaseUserId = dto.supabaseUserId;
    let session = null;

    // If supabaseUserId is provided (from frontend after Supabase signup),
    // skip Supabase signup and just create local records
    if (!supabaseUserId) {
      // Register with Supabase
      const { user: supabaseUser, session: supabaseSession, error } = await this.supabase.signUp(
        dto.email.toLowerCase(),
        dto.password,
        {
          name: dto.name,
          role: UserRole.hotel_owner,
          hotelName: dto.hotelName,
        },
      );

      if (error) {
        if (error.message.includes('already registered')) {
          throw new ConflictException('Email already registered');
        }
        throw new BadRequestException(error.message);
      }

      if (!supabaseUser) {
        throw new BadRequestException('Failed to create user');
      }

      supabaseUserId = supabaseUser.id;
      session = supabaseSession;
    }

    // Determine user status based on whether email verification is pending
    const userStatus = dto.pendingEmailVerification
      ? UserStatus.pending_verification
      : UserStatus.active;

    // Create or update hotel and user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      let hotel = existingHotel;

      // Create hotel if it doesn't exist
      if (!hotel) {
        hotel = await tx.hotel.create({
          data: {
            name: dto.hotelName,
            slug: dto.hotelSlug.toLowerCase(),
            email: dto.email.toLowerCase(),
          },
        });
      }

      let user;

      if (existingUser) {
        // Update existing pending verification user
        user = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            id: supabaseUserId, // Update to new Supabase ID
            name: dto.name,
            hotelId: hotel.id,
            status: userStatus,
          },
        });
      } else {
        // Create owner user with Supabase ID
        user = await tx.user.create({
          data: {
            id: supabaseUserId,
            email: dto.email.toLowerCase(),
            passwordHash: 'supabase-managed',
            name: dto.name,
            role: UserRole.hotel_owner,
            hotelId: hotel.id,
            status: userStatus,
          },
        });
      }

      return { hotel, user };
    });

    // Create audit log
    await this.createAuditLog(
      result.hotel.id,
      result.user.id,
      'register_hotel_owner',
      'hotel',
      result.hotel.id,
    );

    // Send welcome email (non-blocking) - only if not pending verification
    if (!dto.pendingEmailVerification) {
      this.sendWelcomeEmailAsync(
        result.user.name,
        result.user.email,
        result.user.hotelId,
        result.hotel.name,
      );
    }

    // If session is null (email confirmation required or already provided via Supabase)
    if (!session) {
      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          hotelId: result.user.hotelId,
        },
        tokens: {
          accessToken: '',
          refreshToken: '',
          expiresIn: 0,
          tokenType: 'Bearer',
        },
      };
    }

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        hotelId: result.user.hotelId,
      },
      tokens: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in || 3600,
        tokenType: 'Bearer',
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<TokenResponseDto> {
    const { session, error } = await this.supabase.refreshSession(dto.refreshToken);

    if (error || !session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in || 3600,
      tokenType: 'Bearer',
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    // Sign out from Supabase
    await this.supabase.signOut();

    // Also clean up any legacy refresh tokens in database
    try {
      if (refreshToken) {
        await this.prisma.refreshToken.deleteMany({
          where: {
            userId,
            token: refreshToken,
          },
        });
      } else {
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    // Use Supabase password reset
    const frontendUrl = this.configService.get<string>('frontend.adminUrl') || 'http://localhost:3000';
    const redirectTo = `${frontendUrl}/auth/callback?next=/reset-password`;

    const { error } = await this.supabase.resetPasswordForEmail(
      dto.email.toLowerCase(),
      redirectTo,
    );

    // Always return success to prevent email enumeration
    if (error) {
      this.logger.warn(`Password reset request failed: ${error.message}`);
    }

    // Also log in audit if user exists
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
    });

    if (user) {
      await this.createAuditLog(
        user.hotelId,
        user.id,
        'password_reset_requested',
        'user',
        user.id,
      );
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(_dto: unknown): Promise<{ message: string }> {
    // For Supabase, the token is handled on the frontend
    // This endpoint is called after the user sets a new password via Supabase UI
    // The actual password reset happens via Supabase's auth flow
    // The frontend will call supabase.auth.updateUser({ password: newPassword })

    return { message: 'Please use the password reset link sent to your email' };
  }

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

    // Verify current password by trying to sign in
    const { error: signInError } = await this.supabase.signInWithPassword(
      user.email,
      dto.currentPassword,
    );

    if (signInError) {
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

    // Update password in Supabase
    const { error } = await this.supabase.updateUserPassword(dto.newPassword);

    if (error) {
      throw new BadRequestException('Failed to update password');
    }

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

  /**
   * Check if password matches any of the last 5 passwords
   */
  private async checkPasswordHistory(userId: string, newPassword: string): Promise<boolean> {
    try {
      const bcrypt = await import('bcrypt');

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

  /**
   * Add current password to history
   */
  private async addToPasswordHistory(userId: string, passwordHash: string): Promise<void> {
    try {
      // Skip if password hash is placeholder (Supabase-managed)
      if (passwordHash === 'supabase-managed') {
        return;
      }

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

  async validateUser(payload: SupabaseJwtPayload): Promise<any> {
    // Get user from our database using Supabase user ID
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
      hotel: user.hotel,
    };
  }

  async validateUserByToken(accessToken: string): Promise<any> {
    // Verify token with Supabase
    const { user: supabaseUser, error } = await this.supabase.getUser(accessToken);

    if (error || !supabaseUser) {
      return null;
    }

    // Get user from our database
    const user = await this.prisma.user.findUnique({
      where: { id: supabaseUser.id },
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
      hotel: user.hotel,
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

  /**
   * Send welcome email asynchronously (non-blocking)
   */
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
   * Request email verification for a user
   */
  async requestEmailVerification(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Supabase handles email verification automatically
    // This can be triggered by resending the confirmation email

    await this.createAuditLog(
      user.hotelId,
      user.id,
      'email_verification_requested',
      'user',
      user.id,
    );

    return { message: 'Verification email sent' };
  }

  /**
   * Verify email with token (handled by Supabase)
   */
  async verifyEmail(_token: string): Promise<{ message: string }> {
    // Supabase handles email verification via its own flow
    // This endpoint may not be needed if using Supabase's built-in verification
    return { message: 'Email verification is handled by Supabase' };
  }

  /**
   * Sync user verification status from Supabase
   * Called after email verification to update local user status
   */
  async syncUserVerificationStatus(
    supabaseUserId: string,
    isEmailVerified: boolean,
  ): Promise<{ user: any; updated: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: supabaseUserId },
      include: { hotel: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let updated = false;

    // If user is pending verification and email is now verified, update status
    if (user.status === UserStatus.pending_verification && isEmailVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.active },
      });
      updated = true;

      // Create audit log
      await this.createAuditLog(
        user.hotelId,
        user.id,
        'email_verified',
        'user',
        user.id,
      );

      // Send welcome email now that email is verified
      this.sendWelcomeEmailAsync(
        user.name,
        user.email,
        user.hotelId,
        user.hotel?.name,
      );

      this.logger.log(`User ${user.email} email verified, status updated to active`);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hotelId: user.hotelId,
        status: updated ? UserStatus.active : user.status,
      },
      updated,
    };
  }

  /**
   * Get user by email (for frontend to check if user exists)
   */
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

  /**
   * Validate user with pending verification status allowed
   * Used for endpoints that need to work during email verification flow
   */
  async validateUserIncludingPending(payload: SupabaseJwtPayload): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { hotel: true },
    });

    if (!user) {
      return null;
    }

    // Allow both active and pending_verification users
    if (user.status !== UserStatus.active && user.status !== UserStatus.pending_verification) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hotelId: user.hotelId,
      hotel: user.hotel,
      status: user.status,
      isEmailVerified: user.status === UserStatus.active,
    };
  }

  /**
   * Sync user after email verification
   * Called from frontend after successful email verification to sync local database
   */
  async syncUserAfterVerification(
    supabaseUserId: string,
    email: string,
  ): Promise<{ user: any; synced: boolean }> {
    const normalizedEmail = email.toLowerCase();

    // First try to find user by Supabase ID
    let user = await this.prisma.user.findUnique({
      where: { id: supabaseUserId },
      include: { hotel: true },
    });

    // If not found by ID, try by email
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { email: normalizedEmail },
        include: { hotel: true },
      });

      // If found by email but has different ID, update the ID
      if (user && user.id !== supabaseUserId) {
        this.logger.log(`Updating user ID from ${user.id} to ${supabaseUserId} for ${normalizedEmail}`);
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { id: supabaseUserId },
          include: { hotel: true },
        });
      }
    }

    if (!user) {
      throw new NotFoundException('User not found. Please register first.');
    }

    // Update status to active if pending verification
    let synced = false;
    if (user.status === UserStatus.pending_verification) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.active },
      });
      user.status = UserStatus.active;
      synced = true;

      // Create audit log
      await this.createAuditLog(
        user.hotelId,
        user.id,
        'email_verified_sync',
        'user',
        user.id,
      );

      // Send welcome email now that email is verified
      this.sendWelcomeEmailAsync(
        user.name,
        user.email,
        user.hotelId,
        user.hotel?.name,
      );

      this.logger.log(`User ${user.email} synced after email verification, status updated to active`);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hotelId: user.hotelId,
      },
      synced,
    };
  }
}
