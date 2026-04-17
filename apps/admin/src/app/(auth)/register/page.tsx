'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, message, clearError, clearMessage } = useAuthStore();

  const [formData, setFormData] = useState({
    hotelName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    hotelSlug: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showLoginRedirect, setShowLoginRedirect] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    clearMessage();
    setLocalError(null);
    setShowLoginRedirect(false);
    const { name, value } = e.target;

    // Auto-generate slug from hotel name
    if (name === 'hotelName') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData({ ...formData, hotelName: value, hotelSlug: slug });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!agreedToTerms) {
      setLocalError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    const result = await register({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      hotelName: formData.hotelName,
      hotelSlug: formData.hotelSlug,
    });

    if (result.success && result.requiresEmailVerification) {
      // Redirect to verify email page - user MUST verify before accessing dashboard
      router.push('/verify-email?email=' + encodeURIComponent(formData.email));
    } else if (!result.success && result.error) {
      // Check if error is about existing email - show option to go to login
      const errorLower = result.error.toLowerCase();
      if (
        errorLower.includes('already registered') ||
        errorLower.includes('already exists') ||
        errorLower.includes('already in use')
      ) {
        // Set a flag to show the "Go to Login" button
        setShowLoginRedirect(true);
      }
    }
  };

  const handleGoToLogin = () => {
    // Redirect to login with email pre-filled
    router.push('/login?email=' + encodeURIComponent(formData.email));
  };

  const displayError = localError || error;

  return (
    <div className="w-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      {displayError && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{displayError}</p>
          {showLoginRedirect && (
            <button
              type="button"
              onClick={handleGoToLogin}
              className="mt-3 w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              Go to Login Page
            </button>
          )}
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-700">{message}</p>
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-5">
          <div>
            <label htmlFor="hotelName" className="block text-sm font-medium text-gray-700 mb-1">
              Hotel name
            </label>
            <input
              id="hotelName"
              name="hotelName"
              type="text"
              required
              value={formData.hotelName}
              onChange={handleChange}
              className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm transition-shadow"
              placeholder="Your Hotel Name"
            />
            {formData.hotelSlug && (
              <p className="mt-1.5 text-xs text-indigo-600/80">
                URL: hotel-assistant.com/<span className="font-semibold text-indigo-700">{formData.hotelSlug}</span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Your name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm transition-shadow"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
              className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm transition-shadow"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={12}
                value={formData.password}
                onChange={handleChange}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm transition-shadow pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Min 12 characters with uppercase, lowercase, number & special character
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={12}
                value={formData.confirmPassword}
                onChange={handleChange}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm transition-shadow pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center mt-6">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
            I agree to the{' '}
            <Link href="#" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              Privacy Policy
            </Link>
          </label>
        </div>

        <div className="mt-8">
          <button
            type="submit"
            disabled={isLoading || !agreedToTerms}
            className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
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
                After registration, you&apos;ll receive an email to verify your account before you can access the dashboard.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
