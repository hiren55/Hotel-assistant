'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    resendVerificationEmail,
    isLoading,
    error,
    message,
    isAuthenticated,
    isEmailVerified,
    clearError,
    clearMessage,
  } = useAuthStore();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [localError, setLocalError] = useState<string | null>(null);

  // Handle token-based verification from email link
  useEffect(() => {
    const handleVerification = async () => {
      const token = searchParams.get('token');
      if (!token) return;

      setStatus('verifying');

      try {
        // Call backend to verify the token
        await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        setStatus('success');

        // Redirect to login after success
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } catch (err) {
        console.error('Email verification error:', err);
        setStatus('error');
        setLocalError(err instanceof Error ? err.message : 'Verification failed. The link may be expired.');
      }
    };

    handleVerification();
  }, [searchParams, router]);

  // Check if user is already verified and redirect
  useEffect(() => {
    if (isAuthenticated && isEmailVerified) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isEmailVerified, router]);

  const handleResendVerification = async () => {
    if (!email) {
      setLocalError('Please enter your email address');
      return;
    }

    clearError();
    clearMessage();
    setLocalError(null);

    const result = await resendVerificationEmail(email);
    if (!result.success) {
      setLocalError(result.error || 'Failed to send verification email');
    }
  };

  const displayError = localError || error;

  // Verifying state
  if (status === 'verifying') {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
          Verifying your email...
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Please wait while we confirm your email address.
        </p>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
            Email verified!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your email has been verified successfully. Redirecting to login...
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

  // Error state
  if (status === 'error') {
    return (
      <div>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
            Verification failed
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {displayError || 'The verification link is invalid or has expired.'}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Enter your email to resend verification
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLocalError(null);
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          {message && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-700">{message}</p>
            </div>
          )}

          <button
            onClick={handleResendVerification}
            disabled={isLoading}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Resend verification email'}
          </button>

          <div className="text-center">
            <Link href="/login" className="font-medium text-primary hover:text-primary/90">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pending state (waiting for user to verify email)
  return (
    <div>
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
          Verify your email
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          We&apos;ve sent a verification link to your email address. Please check your inbox and click the link to verify your account.
        </p>
        {email && (
          <p className="mt-2 text-sm font-medium text-gray-900">{email}</p>
        )}
      </div>

      <div className="mt-8 space-y-4">
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Important:</strong> You must verify your email before you can access the dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Can&apos;t find the email? Check your spam folder.
              </p>
            </div>
          </div>
        </div>

        {displayError && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{displayError}</p>
          </div>
        )}

        {message && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-700">{message}</p>
          </div>
        )}

        <div>
          <label htmlFor="resend-email" className="block text-sm font-medium text-gray-700">
            Didn&apos;t receive an email? Enter your email to resend:
          </label>
          <input
            id="resend-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setLocalError(null);
              clearError();
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            placeholder="you@example.com"
          />
        </div>

        <button
          onClick={handleResendVerification}
          disabled={isLoading || !email}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : 'Resend verification email'}
        </button>

        <div className="text-center">
          <Link href="/login" className="font-medium text-primary hover:text-primary/90">
            Back to login
          </Link>
        </div>
      </div>
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
