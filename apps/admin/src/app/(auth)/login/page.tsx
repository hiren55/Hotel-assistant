'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    login,
    resendVerificationEmail,
    isLoading,
    error,
    message,
    clearError,
    clearMessage,
  } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showResendOption, setShowResendOption] = useState(false);
  const [urlMessage, setUrlMessage] = useState<string | null>(null);

  // Pre-fill email from URL query parameter (e.g., when redirected from register)
  // Also handle success message from password reset
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
    }

    // Handle success message from password reset or other redirects
    const messageParam = searchParams.get('message');
    if (messageParam) {
      setUrlMessage(decodeURIComponent(messageParam.replace(/\+/g, ' ')));
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('message');
      window.history.replaceState(null, '', url.toString());
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    clearMessage();
    setShowResendOption(false);
    setUrlMessage(null);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowResendOption(false);

    const result = await login(formData);

    if (result.success) {
      router.push('/dashboard');
    } else if (result.requiresEmailVerification) {
      setShowResendOption(true);
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) return;
    await resendVerificationEmail(formData.email);
  };

  return (
    <div>
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Or{' '}
          <Link href="/register" className="font-medium text-primary hover:text-primary/90">
            create a new account
          </Link>
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          {showResendOption && formData.email && (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isLoading}
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-600 underline disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Resend verification email'}
            </button>
          )}
        </div>
      )}

      {(message || urlMessage) && (
        <div className="mt-4 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-700">{urlMessage || message}</p>
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4 rounded-md shadow-sm">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <Link href="/forgot-password" className="font-medium text-primary hover:text-primary/90">
              Forgot your password?
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}
