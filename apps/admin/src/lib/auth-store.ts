'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from './supabase';
import { api, User, Tokens, RegisterHotelRequest } from './api';

// ============================================
// TYPES
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  password: string;
  confirmPassword: string;
}

export interface AuthResult {
  success: boolean;
  requiresEmailVerification?: boolean;
  message?: string;
  error?: string;
}

// Session duration: 12 hours in milliseconds
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

interface AuthState {
  // State
  user: User | null;
  tokens: Tokens | null;
  loginTimestamp: number | null; // Timestamp when user logged in (for 12-hour auto-logout)
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  message: string | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;

  // Actions
  initializeAuth: () => Promise<void>;
  login: (data: LoginRequest) => Promise<AuthResult>;
  register: (data: RegisterHotelRequest) => Promise<AuthResult>;
  logout: () => Promise<void>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<AuthResult>;
  resetPassword: (data: ResetPasswordRequest) => Promise<AuthResult>;
  resendVerificationEmail: (email: string) => Promise<AuthResult>;
  verifyEmailToken: () => Promise<AuthResult>;
  clearError: () => void;
  clearMessage: () => void;
  clearAll: () => void;
  checkAuthStatus: () => Promise<boolean>;
  isSessionExpired: () => boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[@$!%*?&]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (@$!%*?&)' };
  }
  return { valid: true };
};

const validateEmail = (email: string): { valid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true };
};

// ============================================
// AUTH STORE
// ============================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      tokens: null,
      loginTimestamp: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      message: null,
      isAuthenticated: false,
      isEmailVerified: false,

      // ============================================
      // SESSION EXPIRY CHECK (12-hour auto-logout)
      // ============================================
      isSessionExpired: () => {
        const { loginTimestamp } = get();
        if (!loginTimestamp) return true;
        return Date.now() - loginTimestamp > SESSION_DURATION_MS;
      },

      // ============================================
      // INITIALIZE AUTH
      // ============================================
      initializeAuth: async () => {
        try {
          // Check if session has expired (12-hour limit)
          if (get().isSessionExpired() && get().isAuthenticated) {
            console.log('Session expired (12-hour limit reached), logging out...');
            await get().logout();
            set({ isInitialized: true });
            return;
          }

          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error('Error getting session:', error);
            set({ isInitialized: true });
            return;
          }

          if (session?.user) {
            // Check if email is verified
            const isVerified = session.user.email_confirmed_at !== null;

            if (!isVerified) {
              // User has session but email not verified - clear session
              await supabase.auth.signOut();
              set({
                user: null,
                tokens: null,
                isAuthenticated: false,
                isEmailVerified: false,
                isInitialized: true,
              });
              return;
            }

            // Email is verified, set up authenticated state
            api.setAccessToken(session.access_token);

            try {
              // Fetch user data from backend
              const response = await api.get<{ data: User }>('/auth/me');
              set({
                user: response.data,
                tokens: {
                  accessToken: session.access_token,
                  refreshToken: session.refresh_token,
                  expiresIn: session.expires_in || 3600,
                  tokenType: 'Bearer',
                },
                isAuthenticated: true,
                isEmailVerified: true,
                isInitialized: true,
              });
            } catch {
              // Backend user fetch failed - user needs to login properly
              // This can happen after email verification when backend record wasn't synced
              console.log('Backend user not found, redirecting to login...');

              // Sign out and let user login with credentials
              await supabase.auth.signOut();
              set({
                user: null,
                tokens: null,
                isAuthenticated: false,
                isEmailVerified: false,
                isInitialized: true,
                message: 'Email verified! Please login to continue.',
              });
            }
          } else {
            set({ isInitialized: true });
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          set({ isInitialized: true });
        }
      },

      // ============================================
      // REGISTER - No session until email verified
      // ============================================
      register: async (data: RegisterHotelRequest): Promise<AuthResult> => {
        set({ isLoading: true, error: null, message: null });

        try {
          const normalizedEmail = normalizeEmail(data.email);

          // Validate email
          const emailValidation = validateEmail(normalizedEmail);
          if (!emailValidation.valid) {
            set({ isLoading: false, error: emailValidation.error });
            return { success: false, error: emailValidation.error };
          }

          // Validate password
          const passwordValidation = validatePassword(data.password);
          if (!passwordValidation.valid) {
            set({ isLoading: false, error: passwordValidation.error });
            return { success: false, error: passwordValidation.error };
          }

          // SECURITY: Pre-check if email already exists in backend before Supabase signup
          try {
            const checkResponse = await api.get<{ exists: boolean; verified: boolean } | null>(
              `/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`
            );

            if (checkResponse && checkResponse.exists) {
              const errorMsg = 'This email is already registered. Please login instead.';
              set({
                isLoading: false,
                error: errorMsg,
              });
              return {
                success: false,
                error: errorMsg,
              };
            }
          } catch {
            // If check fails, continue with registration (Supabase will catch duplicates)
            console.log('Email pre-check failed, continuing with registration');
          }

          // Check if user already exists in Supabase
          // We'll try to sign up and handle the error if user exists
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: data.password,
            options: {
              data: {
                name: data.name,
                hotelName: data.hotelName,
              },
              emailRedirectTo: `${window.location.origin}/auth/callback?type=signup&next=/dashboard`,
            },
          });

          if (authError) {
            // Handle user already exists - check multiple variations of the error message
            const errorLower = authError.message.toLowerCase();
            if (
              errorLower.includes('already registered') ||
              errorLower.includes('already been registered') ||
              errorLower.includes('user already exists') ||
              errorLower.includes('email already') ||
              errorLower.includes('duplicate') ||
              errorLower.includes('already in use')
            ) {
              const duplicateError = 'This email is already registered. Please login or use forgot password.';
              set({
                isLoading: false,
                error: duplicateError,
              });
              return {
                success: false,
                error: duplicateError,
              };
            }
            throw new Error(authError.message);
          }

          // SECURITY: Check if Supabase returned a user but with identities array empty
          // This can happen when email already exists but confirmation is pending
          if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
            const duplicateError = 'This email is already registered. Please login or check your email for verification.';
            set({
              isLoading: false,
              error: duplicateError,
            });
            return {
              success: false,
              error: duplicateError,
            };
          }

          // Check if user was created but needs verification
          // Supabase returns user but no session when email confirmation is required
          if (authData.user && !authData.session) {
            // User created, needs email verification
            // Also create record in our backend (pending verification status)
            try {
              await api.post('/auth/register/hotel', {
                email: normalizedEmail,
                password: data.password,
                name: data.name,
                hotelName: data.hotelName,
                hotelSlug: data.hotelSlug,
                supabaseUserId: authData.user.id,
                pendingEmailVerification: true,
              });
            } catch (backendError) {
              console.warn('Backend pre-registration:', backendError);
              // Continue anyway - user will be synced on first login after verification
            }

            set({
              isLoading: false,
              message: 'Registration successful! Please check your email to verify your account.',
              error: null,
            });

            return {
              success: true,
              requiresEmailVerification: true,
              message: 'Please check your email to verify your account before logging in.',
            };
          }

          // If Supabase returned a session (email confirmation disabled)
          // We still don't allow access - sign out and require verification
          if (authData.session) {
            // Sign out immediately - we require email verification
            await supabase.auth.signOut();

            // Create backend record
            try {
              await api.post('/auth/register/hotel', {
                email: normalizedEmail,
                password: data.password,
                name: data.name,
                hotelName: data.hotelName,
                hotelSlug: data.hotelSlug,
                supabaseUserId: authData.user?.id,
                pendingEmailVerification: true,
              });
            } catch (backendError) {
              console.warn('Backend pre-registration:', backendError);
            }

            // Manually send verification email since Supabase auto-confirmed
            await supabase.auth.resend({
              type: 'signup',
              email: normalizedEmail,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?type=signup&next=/dashboard`,
              },
            });

            set({
              isLoading: false,
              message: 'Registration successful! Please check your email to verify your account.',
              error: null,
            });

            return {
              success: true,
              requiresEmailVerification: true,
              message: 'Please check your email to verify your account before logging in.',
            };
          }

          throw new Error('Unexpected registration state');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // LOGIN - Only allow verified users
      // ============================================
      login: async (data: LoginRequest): Promise<AuthResult> => {
        set({ isLoading: true, error: null, message: null });

        try {
          const normalizedEmail = normalizeEmail(data.email);

          // Validate email format
          const emailValidation = validateEmail(normalizedEmail);
          if (!emailValidation.valid) {
            set({ isLoading: false, error: emailValidation.error });
            return { success: false, error: emailValidation.error };
          }

          // Attempt to sign in with Supabase
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: data.password,
          });

          if (authError) {
            console.error('Login error:', authError.message);

            // Handle email not confirmed
            if (authError.message.includes('Email not confirmed')) {
              // Resend verification email
              await supabase.auth.resend({
                type: 'signup',
                email: normalizedEmail,
                options: {
                  emailRedirectTo: `${window.location.origin}/auth/callback?type=signup&next=/dashboard`,
                },
              });

              set({
                isLoading: false,
                error: 'Please verify your email before logging in. A new verification email has been sent.',
              });

              return {
                success: false,
                requiresEmailVerification: true,
                error: 'Please verify your email before logging in. A new verification email has been sent.',
              };
            }

            // Handle invalid credentials
            if (authError.message.includes('Invalid login credentials')) {
              set({
                isLoading: false,
                error: 'Invalid email or password. Please check your credentials.',
              });
              return { success: false, error: 'Invalid email or password.' };
            }

            throw new Error(authError.message);
          }

          if (!authData.session || !authData.user) {
            throw new Error('Login failed - no session returned');
          }

          // Double-check email verification status
          if (!authData.user.email_confirmed_at) {
            // Email not verified - sign out and send verification
            await supabase.auth.signOut();

            await supabase.auth.resend({
              type: 'signup',
              email: normalizedEmail,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?type=signup&next=/dashboard`,
              },
            });

            set({
              isLoading: false,
              error: 'Please verify your email before logging in. A verification email has been sent.',
            });

            return {
              success: false,
              requiresEmailVerification: true,
              error: 'Please verify your email before logging in.',
            };
          }

          // Email is verified - proceed with login
          api.setAccessToken(authData.session.access_token);

          // Fetch/sync user from backend
          try {
            const response = await api.get<{ data: User }>('/auth/me');

            set({
              user: response.data,
              tokens: {
                accessToken: authData.session.access_token,
                refreshToken: authData.session.refresh_token,
                expiresIn: authData.session.expires_in || 3600,
                tokenType: 'Bearer',
              },
              loginTimestamp: Date.now(), // Set login timestamp for 12-hour auto-logout
              isAuthenticated: true,
              isEmailVerified: true,
              isLoading: false,
              error: null,
            });

            return { success: true };
          } catch {
            // Backend fetch failed - try to sync user
            // This can happen if user verified email but backend record wasn't created
            try {
              // Call backend login to sync/create user
              const loginResponse = await api.post<{ user: User; tokens: Tokens }>('/auth/login', {
                email: normalizedEmail,
                password: data.password,
              });

              // Set the token from backend login response before calling /auth/me
              if (loginResponse.tokens?.accessToken) {
                api.setAccessToken(loginResponse.tokens.accessToken);
              }

              // Now fetch user with the correct token
              const response = await api.get<{ data: User }>('/auth/me');

              set({
                user: response.data,
                tokens: loginResponse.tokens || {
                  accessToken: authData.session.access_token,
                  refreshToken: authData.session.refresh_token,
                  expiresIn: authData.session.expires_in || 3600,
                  tokenType: 'Bearer',
                },
                loginTimestamp: Date.now(), // Set login timestamp for 12-hour auto-logout
                isAuthenticated: true,
                isEmailVerified: true,
                isLoading: false,
                error: null,
              });

              return { success: true };
            } catch (syncError) {
              console.error('User sync failed:', syncError);
              await supabase.auth.signOut();
              set({
                isLoading: false,
                error: 'Login failed. Please try again or contact support.',
              });
              return { success: false, error: 'Login failed. Please try again.' };
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // LOGOUT - Complete session cleanup with backend invalidation
      // ============================================
      logout: async () => {
        // Set flag to prevent recursive logout from onAuthStateChange listener
        if (typeof window !== 'undefined') {
          (window as any).__isLoggingOut = true;
        }

        // Get the current token before clearing state
        const currentToken = api.getAccessToken();

        // IMMEDIATELY clear local state for instant UI response
        api.setAccessToken(null);
        set({
          user: null,
          tokens: null,
          loginTimestamp: null,
          isAuthenticated: false,
          isEmailVerified: false,
          error: null,
          message: null,
        });

        // Clear persisted storage immediately
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
          sessionStorage.clear();
        }

        // Now do the async cleanup in background (don't block UI)
        // These calls happen after state is already cleared
        try {
          // Call backend logout endpoint to invalidate tokens on server
          if (currentToken) {
            // Temporarily restore token just for the logout API call
            api.setAccessToken(currentToken);
            try {
              await api.post('/auth/logout');
            } catch (backendError) {
              console.warn('Backend logout failed:', backendError);
            }
            api.setAccessToken(null);
          }

          // Sign out from Supabase (invalidates all sessions)
          try {
            await supabase.auth.signOut({ scope: 'global' });
          } catch (signOutError) {
            console.warn('Supabase signOut error:', signOutError);
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Reset the flag
          if (typeof window !== 'undefined') {
            (window as any).__isLoggingOut = false;
          }
        }
      },

      // ============================================
      // FORGOT PASSWORD
      // ============================================
      forgotPassword: async (data: ForgotPasswordRequest): Promise<AuthResult> => {
        set({ isLoading: true, error: null, message: null });

        try {
          const normalizedEmail = normalizeEmail(data.email);

          const emailValidation = validateEmail(normalizedEmail);
          if (!emailValidation.valid) {
            set({ isLoading: false, error: emailValidation.error });
            return { success: false, error: emailValidation.error };
          }

          // For password reset, redirect directly to reset-password page (not via callback)
          // This avoids PKCE code_verifier issues when user opens link in different browser/session
          const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: `${window.location.origin}/reset-password`,
          });

          if (error) {
            throw new Error(error.message);
          }

          set({
            isLoading: false,
            message: 'If an account exists with this email, you will receive a password reset link.',
            error: null,
          });

          return {
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link.',
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // RESET PASSWORD
      // ============================================
      resetPassword: async (data: ResetPasswordRequest): Promise<AuthResult> => {
        set({ isLoading: true, error: null, message: null });

        try {
          // Validate password match
          if (data.password !== data.confirmPassword) {
            set({ isLoading: false, error: 'Passwords do not match' });
            return { success: false, error: 'Passwords do not match' };
          }

          // Validate password strength
          const passwordValidation = validatePassword(data.password);
          if (!passwordValidation.valid) {
            set({ isLoading: false, error: passwordValidation.error });
            return { success: false, error: passwordValidation.error };
          }

          // Verify we have a valid session before attempting password update
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

          if (sessionError || !sessionData.session) {
            console.error('No valid session for password reset:', sessionError);
            set({ isLoading: false, error: 'Session expired. Please request a new password reset link.' });
            return { success: false, error: 'Session expired. Please request a new password reset link.' };
          }

          console.log('Updating password for user:', sessionData.session.user?.email);

          // Update password in Supabase
          const { data: updateData, error: updateError } = await supabase.auth.updateUser({
            password: data.password,
          });

          if (updateError) {
            console.error('Password update error:', updateError);
            // Handle specific error cases
            if (updateError.message.includes('same password')) {
              set({ isLoading: false, error: 'New password must be different from current password.' });
              return { success: false, error: 'New password must be different from current password.' };
            }
            throw new Error(updateError.message);
          }

          if (!updateData.user) {
            throw new Error('Password update failed. Please try again.');
          }

          console.log('Password updated successfully for:', updateData.user.email);

          // Sign out to invalidate all sessions (security best practice)
          await supabase.auth.signOut({ scope: 'global' });

          // Clear local state
          api.setAccessToken(null);

          // Clear persisted storage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage');
          }

          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isEmailVerified: false,
            isLoading: false,
            message: 'Password reset successful. Please login with your new password.',
            error: null,
          });

          return {
            success: true,
            message: 'Password reset successful. Please login with your new password.',
          };
        } catch (error) {
          console.error('Reset password error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // RESEND VERIFICATION EMAIL
      // ============================================
      resendVerificationEmail: async (email: string): Promise<AuthResult> => {
        set({ isLoading: true, error: null, message: null });

        try {
          const normalizedEmail = normalizeEmail(email);

          const { error } = await supabase.auth.resend({
            type: 'signup',
            email: normalizedEmail,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?type=signup&next=/dashboard`,
            },
          });

          if (error) {
            throw new Error(error.message);
          }

          set({
            isLoading: false,
            message: 'Verification email sent. Please check your inbox.',
            error: null,
          });

          return {
            success: true,
            message: 'Verification email sent. Please check your inbox.',
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send verification email';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // VERIFY EMAIL TOKEN (called from callback)
      // ============================================
      verifyEmailToken: async (): Promise<AuthResult> => {
        set({ isLoading: true, error: null, message: null });

        try {
          // Get current session after callback redirect
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error || !session?.user) {
            throw new Error('Invalid or expired verification link');
          }

          // Verify email is now confirmed
          if (!session.user.email_confirmed_at) {
            throw new Error('Email verification failed');
          }

          // Set up authenticated state
          api.setAccessToken(session.access_token);

          // Sync with backend
          try {
            const response = await api.get<{ data: User }>('/auth/me');

            set({
              user: response.data,
              tokens: {
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
                expiresIn: session.expires_in || 3600,
                tokenType: 'Bearer',
              },
              loginTimestamp: Date.now(), // Set login timestamp for 12-hour auto-logout
              isAuthenticated: true,
              isEmailVerified: true,
              isLoading: false,
              message: 'Email verified successfully!',
              error: null,
            });

            return { success: true, message: 'Email verified successfully!' };
          } catch {
            // Try to sync user via login endpoint
            if (session.user.email) {
              try {
                await api.post('/auth/sync-user', {
                  supabaseUserId: session.user.id,
                  email: session.user.email,
                });

                const response = await api.get<{ data: User }>('/auth/me');

                set({
                  user: response.data,
                  tokens: {
                    accessToken: session.access_token,
                    refreshToken: session.refresh_token,
                    expiresIn: session.expires_in || 3600,
                    tokenType: 'Bearer',
                  },
                  loginTimestamp: Date.now(), // Set login timestamp for 12-hour auto-logout
                  isAuthenticated: true,
                  isEmailVerified: true,
                  isLoading: false,
                  message: 'Email verified successfully!',
                  error: null,
                });

                return { success: true, message: 'Email verified successfully!' };
              } catch (syncError) {
                console.error('User sync failed:', syncError);
              }
            }

            // If sync fails, still mark as verified but user needs to login
            await supabase.auth.signOut();
            set({
              isLoading: false,
              message: 'Email verified! Please login to continue.',
              error: null,
            });

            return {
              success: true,
              message: 'Email verified! Please login to continue.',
            };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Verification failed';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // CHECK AUTH STATUS (for protected routes)
      // ============================================
      checkAuthStatus: async (): Promise<boolean> => {
        const state = get();

        // Check if session has expired (12-hour limit) - only for authenticated users
        if (state.isAuthenticated && get().isSessionExpired()) {
          console.log('Session expired (12-hour limit), forcing logout...');
          await get().logout();
          return false;
        }

        // If already authenticated and verified, return true
        if (state.isAuthenticated && state.isEmailVerified && state.user) {
          return true;
        }

        // Check Supabase session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          return false;
        }

        // Check email verification
        if (!session.user.email_confirmed_at) {
          await supabase.auth.signOut();
          return false;
        }

        // Re-initialize auth if needed
        if (!state.isInitialized) {
          await get().initializeAuth();
        }

        return get().isAuthenticated && get().isEmailVerified;
      },

      // ============================================
      // UTILITY FUNCTIONS
      // ============================================
      clearError: () => set({ error: null }),
      clearMessage: () => set({ message: null }),
      clearAll: () => set({ error: null, message: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        loginTimestamp: state.loginTimestamp,
        isAuthenticated: state.isAuthenticated,
        isEmailVerified: state.isEmailVerified,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.tokens?.accessToken) {
          api.setAccessToken(state.tokens.accessToken);
        }
      },
    }
  )
);

// ============================================
// SUPABASE AUTH STATE LISTENER
// ============================================
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Global auth state change:', event, session?.user?.email);

    if (event === 'SIGNED_OUT') {
      // Prevent recursive logout - if logout is already in progress, skip
      if ((window as any).__isLoggingOut) {
        console.log('Logout already in progress, skipping recursive call');
        return;
      }

      // Only clear state if we're not in the middle of a password reset
      const isResetPasswordPage = window.location.pathname.includes('reset-password');
      if (!isResetPasswordPage) {
        // Clear API token
        api.setAccessToken(null);

        // Just clear the local state without calling full logout (which would trigger signOut again)
        useAuthStore.setState({
          user: null,
          tokens: null,
          loginTimestamp: null,
          isAuthenticated: false,
          isEmailVerified: false,
          error: null,
          message: null,
        });

        // Clear persisted storage
        localStorage.removeItem('auth-storage');
        sessionStorage.clear();
      }
    } else if (event === 'PASSWORD_RECOVERY' && session) {
      // User clicked password reset link - session is valid for password update
      // Don't set isAuthenticated=true, just allow the password reset flow
      console.log('Password recovery session detected for:', session.user?.email);
      api.setAccessToken(session.access_token);
    } else if (event === 'TOKEN_REFRESHED' && session) {
      // Update tokens on refresh
      api.setAccessToken(session.access_token);
      useAuthStore.setState({
        tokens: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresIn: session.expires_in || 3600,
          tokenType: 'Bearer',
        },
      });
    } else if (event === 'USER_UPDATED' && session) {
      // Re-check verification status on user update
      if (session.user.email_confirmed_at) {
        useAuthStore.setState({ isEmailVerified: true });
      }
    }
  });
}

export default useAuthStore;
