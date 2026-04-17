'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  token: string;
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

          // Check if we have stored tokens
          const storedToken = typeof window !== 'undefined'
            ? localStorage.getItem('accessToken')
            : null;

          if (storedToken) {
            api.setAccessToken(storedToken);

            try {
              // Verify token by fetching user
              const userResponse = await api.get<User>('/auth/me');
              set({
                user: userResponse,
                isAuthenticated: true,
                isEmailVerified: true,
                isInitialized: true,
              });
            } catch {
              // Token invalid or expired - try refreshing
              const storedRefreshToken = localStorage.getItem('refreshToken');
              if (storedRefreshToken) {
                try {
                  const refreshResponse = await api.post<Tokens>('/auth/refresh', {
                    refreshToken: storedRefreshToken,
                  });

                  api.setAccessToken(refreshResponse.accessToken);
                  localStorage.setItem('accessToken', refreshResponse.accessToken);
                  localStorage.setItem('refreshToken', refreshResponse.refreshToken);

                  const userResponse = await api.get<User>('/auth/me');
                  set({
                    user: userResponse,
                    tokens: refreshResponse,
                    isAuthenticated: true,
                    isEmailVerified: true,
                    isInitialized: true,
                  });
                } catch {
                  // Refresh failed - clear everything
                  api.setAccessToken(null);
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('refreshToken');
                  set({
                    user: null,
                    tokens: null,
                    isAuthenticated: false,
                    isEmailVerified: false,
                    isInitialized: true,
                  });
                }
              } else {
                // No refresh token - clear
                api.setAccessToken(null);
                localStorage.removeItem('accessToken');
                set({
                  user: null,
                  tokens: null,
                  isAuthenticated: false,
                  isEmailVerified: false,
                  isInitialized: true,
                });
              }
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
      // REGISTER
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

          // Pre-check if email already exists
          try {
            const checkResponse = await api.get<{ exists: boolean; verified: boolean } | null>(
              `/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`
            );

            if (checkResponse && checkResponse.exists) {
              const errorMsg = 'This email is already registered. Please login instead.';
              set({ isLoading: false, error: errorMsg });
              return { success: false, error: errorMsg };
            }
          } catch {
            // If check fails, continue with registration
            console.log('Email pre-check failed, continuing with registration');
          }

          // Register via backend API
          const response = await api.post<{ user: User; tokens: Tokens }>('/auth/register/hotel', {
            email: normalizedEmail,
            password: data.password,
            name: data.name,
            hotelName: data.hotelName,
            hotelSlug: data.hotelSlug,
          });

          // Set tokens and user
          api.setAccessToken(response.tokens.accessToken);
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', response.tokens.accessToken);
            localStorage.setItem('refreshToken', response.tokens.refreshToken);
          }

          set({
            user: response.user,
            tokens: response.tokens,
            loginTimestamp: Date.now(),
            isAuthenticated: true,
            isEmailVerified: true,
            isLoading: false,
            error: null,
            message: 'Registration successful! Welcome to Hotel Assistant.',
          });

          return {
            success: true,
            message: 'Registration successful!',
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          // Handle specific error cases
          const errStr = errorMessage.toLowerCase();
          if (errStr.includes('already registered') || errStr.includes('conflict') || errStr.includes('already exists')) {
            const duplicateError = 'This email is already registered. Please login or use forgot password.';
            set({ isLoading: false, error: duplicateError });
            return { success: false, error: duplicateError };
          }
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // LOGIN
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

          // Login via backend API
          const response = await api.post<{ user: User; tokens: Tokens }>('/auth/login', {
            email: normalizedEmail,
            password: data.password,
          });

          // Set tokens
          api.setAccessToken(response.tokens.accessToken);
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', response.tokens.accessToken);
            localStorage.setItem('refreshToken', response.tokens.refreshToken);
          }

          set({
            user: response.user,
            tokens: response.tokens,
            loginTimestamp: Date.now(),
            isAuthenticated: true,
            isEmailVerified: true,
            isLoading: false,
            error: null,
          });

          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';

          // Handle specific error cases
          if (errorMessage.toLowerCase().includes('invalid credentials') ||
            errorMessage.toLowerCase().includes('unauthorized')) {
            set({
              isLoading: false,
              error: 'Invalid email or password. Please check your credentials.',
            });
            return { success: false, error: 'Invalid email or password.' };
          }

          if (errorMessage.toLowerCase().includes('not active')) {
            set({
              isLoading: false,
              error: 'Your account is not active. Please verify your email or contact support.',
            });
            return { success: false, error: 'Account is not active.' };
          }

          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // LOGOUT
      // ============================================
      logout: async () => {
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
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }

        // Now do the async cleanup in background
        try {
          if (currentToken) {
            api.setAccessToken(currentToken);
            try {
              await api.post('/auth/logout');
            } catch (backendError) {
              console.warn('Backend logout failed:', backendError);
            }
            api.setAccessToken(null);
          }
        } catch (error) {
          console.error('Logout error:', error);
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

          // Call backend forgot-password endpoint
          await api.post('/auth/forgot-password', {
            email: normalizedEmail,
          });

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

          // Call backend reset-password endpoint
          await api.post('/auth/reset-password', {
            token: data.token,
            password: data.password,
          });

          // Clear local state
          api.setAccessToken(null);

          // Clear persisted storage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
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
      resendVerificationEmail: async (_email: string): Promise<AuthResult> => {
        set({ isLoading: true, error: null, message: null });

        try {
          // Call backend endpoint (requires authenticated user)
          await api.post('/auth/request-verification');

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
      // VERIFY EMAIL TOKEN (called from verify-email page)
      // ============================================
      verifyEmailToken: async (): Promise<AuthResult> => {
        set({ isLoading: true, error: null, message: null });

        try {
          // Get token from URL query params
          const urlParams = typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search)
            : null;
          const token = urlParams?.get('token');

          if (!token) {
            set({ isLoading: false, error: 'No verification token found.' });
            return { success: false, error: 'No verification token found.' };
          }

          // Call backend verify endpoint
          await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);

          set({
            isLoading: false,
            message: 'Email verified successfully! Please login to continue.',
            error: null,
          });

          return {
            success: true,
            message: 'Email verified successfully! Please login to continue.',
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ============================================
      // CHECK AUTH STATUS
      // ============================================
      checkAuthStatus: async (): Promise<boolean> => {
        try {
          // Check session expiry
          if (get().isSessionExpired()) {
            await get().logout();
            return false;
          }

          // Try to fetch current user
          const storedToken = typeof window !== 'undefined'
            ? localStorage.getItem('accessToken')
            : null;

          if (!storedToken) {
            return false;
          }

          api.setAccessToken(storedToken);
          await api.get<User>('/auth/me');
          return true;
        } catch {
          // Token invalid
          await get().logout();
          return false;
        }
      },

      // ============================================
      // CLEAR HELPERS
      // ============================================
      clearError: () => set({ error: null }),
      clearMessage: () => set({ message: null }),
      clearAll: () => set({ error: null, message: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        // SSR fallback
        return {
          getItem: () => null,
          setItem: () => { },
          removeItem: () => { },
        };
      }),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        loginTimestamp: state.loginTimestamp,
        isAuthenticated: state.isAuthenticated,
        isEmailVerified: state.isEmailVerified,
      }),
    },
  ),
);
