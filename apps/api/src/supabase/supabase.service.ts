import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

export interface SupabaseAuthResponse {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const supabaseAnonKey = this.configService.get<string>('supabase.anonKey');
    const serviceRoleKey = this.configService.get<string>('supabase.serviceRoleKey');

    if (!supabaseUrl || !supabaseAnonKey) {
      this.logger.warn('Supabase URL or Anon Key not configured. Auth features may not work.');
      return;
    }

    // Client for regular operations (respects RLS)
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    // Admin client for server-side operations (bypasses RLS)
    if (serviceRoleKey) {
      this.adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }

    this.logger.log('Supabase clients initialized');
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  /**
   * Sign up a new user with email and password
   */
  async signUp(
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
  ): Promise<SupabaseAuthResponse> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    return {
      user: data.user,
      session: data.session,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * Sign in with email and password
   */
  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<SupabaseAuthResponse> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * Sign out the current user
   */
  async signOut(accessToken?: string): Promise<{ error: Error | null }> {
    if (accessToken) {
      // Sign out specific session
      const { error } = await this.adminClient.auth.admin.signOut(accessToken);
      return { error: error ? new Error(error.message) : null };
    }

    const { error } = await this.supabase.auth.signOut();
    return { error: error ? new Error(error.message) : null };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshSession(refreshToken: string): Promise<SupabaseAuthResponse> {
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    return {
      user: data.user,
      session: data.session,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * Get user from access token (validates the token)
   */
  async getUser(accessToken: string): Promise<{ user: User | null; error: Error | null }> {
    const { data, error } = await this.supabase.auth.getUser(accessToken);

    return {
      user: data.user,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * Send password reset email
   */
  async resetPasswordForEmail(
    email: string,
    redirectTo?: string,
  ): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    return { error: error ? new Error(error.message) : null };
  }

  /**
   * Update user password (requires valid session)
   */
  async updateUserPassword(newPassword: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    return { error: error ? new Error(error.message) : null };
  }

  /**
   * Update user metadata
   */
  async updateUserMetadata(
    userId: string,
    metadata: Record<string, unknown>,
  ): Promise<{ user: User | null; error: Error | null }> {
    const { data, error } = await this.adminClient.auth.admin.updateUserById(userId, {
      user_metadata: metadata,
    });

    return {
      user: data.user,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * Delete a user (admin only)
   */
  async deleteUser(userId: string): Promise<{ error: Error | null }> {
    const { error } = await this.adminClient.auth.admin.deleteUser(userId);
    return { error: error ? new Error(error.message) : null };
  }

  /**
   * Get user by ID (admin only)
   */
  async getUserById(userId: string): Promise<{ user: User | null; error: Error | null }> {
    const { data, error } = await this.adminClient.auth.admin.getUserById(userId);

    return {
      user: data.user,
      error: error ? new Error(error.message) : null,
    };
  }

  /**
   * Verify JWT token and extract claims
   */
  async verifyToken(token: string): Promise<{ user: User | null; error: Error | null }> {
    return this.getUser(token);
  }
}
