'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

/**
 * Password Reset Page - Bulletproof Implementation
 *
 * This page handles password reset with MANUAL token processing.
 * Does NOT rely on Supabase events which may fire before React mounts.
 */

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initialized.current) return;
    initialized.current = true;

    const initializeResetPage = async () => {
      console.log('=== Password Reset Page Initialization ===');

      // Step 1: Check for error in URL params
      const errorParam = searchParams.get('error');
      if (errorParam) {
        console.log('Error in URL:', errorParam);
        setError(decodeURIComponent(errorParam));
        setPageState('error');
        return;
      }

      // Step 2: Get the current hash
      const hash = window.location.hash;
      console.log('Current hash:', hash ? 'present' : 'empty');

      // Step 3: Extract tokens from hash
      let accessToken: string | null = null;
      let refreshToken: string | null = null;

      if (hash && hash.includes('access_token')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        accessToken = hashParams.get('access_token');
        refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        console.log('Extracted from hash - type:', type, 'hasAccessToken:', !!accessToken, 'hasRefreshToken:', !!refreshToken);
      }

      // Step 4: Try to get existing session (might already be set by detectSessionInUrl)
      console.log('Checking for existing session...');
      const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('getSession error:', sessionError);
      }

      if (existingSession) {
        console.log('✓ Existing session found for:', existingSession.user?.email);
        setUserEmail(existingSession.user?.email || null);
        setPageState('ready');
        cleanHash();
        return;
      }

      // Step 5: No existing session - manually set session from hash tokens
      if (accessToken && refreshToken) {
        console.log('Setting session manually from hash tokens...');

        const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (setSessionError) {
          console.error('✗ setSession error:', setSessionError.message);
          setError('Invalid or expired reset link. Please request a new one.');
          setPageState('error');
          cleanHash();
          return;
        }

        if (sessionData.session) {
          console.log('✓ Session set successfully for:', sessionData.session.user?.email);
          setUserEmail(sessionData.session.user?.email || null);
          setPageState('ready');
          cleanHash();
          return;
        }
      }

      // Step 6: No tokens in hash - maybe user navigated here directly
      console.log('No tokens found, checking session one more time...');

      // Wait a moment for any async Supabase processing
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { session: retrySession } } = await supabase.auth.getSession();
      if (retrySession) {
        console.log('✓ Session found on retry for:', retrySession.user?.email);
        setUserEmail(retrySession.user?.email || null);
        setPageState('ready');
        cleanHash();
        return;
      }

      // Step 7: No valid session found
      console.error('✗ No valid session found after all attempts');
      setError('Invalid or expired reset link. Please request a new one.');
      setPageState('error');
      cleanHash();
    };

    const cleanHash = () => {
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    initializeResetPage();
  }, [searchParams]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 12) return 'Password must be at least 12 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    if (!/[@$!%*?&]/.test(password)) return 'Password must contain a special character (@$!%*?&)';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      // Validate password strength
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        setError(passwordError);
        setIsLoading(false);
        return;
      }

      // Verify session exists before update
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please request a new reset link.');
        setIsLoading(false);
        return;
      }

      console.log('Updating password for:', session.user?.email);

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        if (updateError.message.toLowerCase().includes('same')) {
          setError('New password must be different from current password');
        } else {
          setError(updateError.message);
        }
        setIsLoading(false);
        return;
      }

      console.log('✓ Password updated successfully');

      // Sign out all sessions (security)
      await supabase.auth.signOut({ scope: 'global' });

      // Clear local storage
      localStorage.removeItem('auth-storage');

      // Show success
      setPageState('success');

      // Redirect to login
      setTimeout(() => {
        router.replace('/login?message=Password+reset+successful');
      }, 2000);

    } catch (err) {
      console.error('Reset error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // === RENDER STATES ===

  if (pageState === 'loading') {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Verifying reset link...</p>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
            Invalid or expired link
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {error || 'This password reset link is invalid or has expired.'}
          </p>
        </div>
        <div className="mt-8 text-center">
          <Link href="/forgot-password" className="font-medium text-primary hover:text-primary/90">
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
            Password reset successful
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your password has been reset. Redirecting to login...
          </p>
        </div>
        <div className="mt-8 text-center">
          <Link href="/login" className="font-medium text-primary hover:text-primary/90">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  // Ready state - show form
  return (
    <div>
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {userEmail ? `Enter a new password for ${userEmail}` : 'Enter your new password below.'}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={formData.password}
              onChange={(e) => {
                setError(null);
                setFormData({ ...formData, password: e.target.value });
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
              placeholder="••••••••••••"
            />
            <p className="mt-1 text-xs text-gray-500">
              Min 12 characters with uppercase, lowercase, number & special character (@$!%*?&)
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={(e) => {
                setError(null);
                setFormData({ ...formData, confirmPassword: e.target.value });
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
              placeholder="••••••••••••"
            />
          </div>
        </div>

        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                For security, you will be signed out of all devices after resetting your password.
              </p>
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Resetting...' : 'Reset password'}
          </button>
        </div>

        <div className="text-center">
          <Link href="/login" className="font-medium text-primary hover:text-primary/90">
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-sm text-gray-600">Loading...</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
