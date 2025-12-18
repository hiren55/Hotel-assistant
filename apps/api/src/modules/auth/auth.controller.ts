import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  Req,
  Query,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login', description: 'Authenticate user with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto);

    // Set refresh token in HttpOnly cookie
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return result;
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register staff user', description: 'Register a new staff user for existing hotel' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto);

    // Set refresh token in HttpOnly cookie
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return result;
  }

  @Public()
  @Post('register/hotel')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register hotel owner', description: 'Register a new hotel owner with hotel creation' })
  @ApiResponse({ status: 201, description: 'Hotel and owner created successfully' })
  @ApiResponse({ status: 409, description: 'Email or hotel slug already exists' })
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  async registerHotelOwner(
    @Body() dto: RegisterHotelOwnerDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.registerHotelOwner(dto);

    // Set refresh token in HttpOnly cookie
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh tokens', description: 'Get new access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    // Try to get refresh token from cookie if not in body
    const refreshToken = dto.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const result = await this.authService.refreshToken({
      refreshToken,
    });

    // Set new refresh token in HttpOnly cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user', description: 'Get the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getCurrentUser(
    @CurrentUser() user: any,
  ): Promise<{ id: string; email: string; name: string; role: string; hotelId: string | null }> {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hotelId: user.hotelId,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout', description: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const refreshToken = req.cookies?.refreshToken;

    // Use user.id (from validateUser) - the JWT strategy returns user object with id field
    await this.authService.logout(user.id, refreshToken);

    // Clear refresh token cookie
    this.clearRefreshTokenCookie(res);

    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all devices', description: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutAll(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    // Use user.id (from validateUser) - the JWT strategy returns user object with id field
    await this.authService.logout(user.id);

    // Clear refresh token cookie
    this.clearRefreshTokenCookie(res);

    return { message: 'Logged out from all devices successfully' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forgot password', description: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if email exists' })
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password', description: 'Reset password with token from email' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password', description: 'Change password for logged in user' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(user.id, dto);
  }

  @Post('request-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request email verification', description: 'Send verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  async requestEmailVerification(
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    return this.authService.requestEmailVerification(user.id);
  }

  @Public()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email', description: 'Verify email with token from email link' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async verifyEmail(
    @Query('token') token: string,
  ): Promise<{ message: string }> {
    if (!token) {
      throw new Error('Verification token is required');
    }
    return this.authService.verifyEmail(token);
  }

  @Post('sync-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync verification status', description: 'Sync email verification status from Supabase to local database' })
  @ApiResponse({ status: 200, description: 'Status synced successfully' })
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async syncVerificationStatus(
    @CurrentUser() user: any,
    @Body() body: { isEmailVerified: boolean },
  ): Promise<{ user: any; updated: boolean }> {
    return this.authService.syncUserVerificationStatus(user.id, body.isEmailVerified);
  }

  @Public()
  @Get('check-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if email exists', description: 'Check if an email is already registered' })
  @ApiResponse({ status: 200, description: 'Email status returned' })
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async checkEmail(
    @Query('email') email: string,
  ): Promise<{ exists: boolean; verified: boolean } | { exists: boolean }> {
    if (!email) {
      return { exists: false };
    }
    const result = await this.authService.getUserByEmail(email);
    if (!result) {
      return { exists: false };
    }
    return result;
  }

  @Public()
  @Post('sync-user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync user after email verification', description: 'Sync user data after email verification from Supabase' })
  @ApiResponse({ status: 200, description: 'User synced successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async syncUser(
    @Body() body: { supabaseUserId: string; email: string },
  ): Promise<{ user: any; synced: boolean }> {
    return this.authService.syncUserAfterVerification(body.supabaseUserId, body.email);
  }

  private setRefreshTokenCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refreshToken', {
      path: '/api/v1/auth',
    });
  }
}
