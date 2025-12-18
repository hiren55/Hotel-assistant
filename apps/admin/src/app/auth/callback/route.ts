import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const type = requestUrl.searchParams.get('type'); // signup, recovery, etc.
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Handle errors from Supabase
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    const errorMessage = encodeURIComponent(errorDescription || error);

    if (type === 'recovery') {
      return NextResponse.redirect(
        new URL(`/reset-password?error=${errorMessage}`, requestUrl.origin)
      );
    }

    return NextResponse.redirect(
      new URL(`/verify-email?verified=false&error=${errorMessage}`, requestUrl.origin)
    );
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase configuration missing');
    return NextResponse.redirect(
      new URL('/login?error=Configuration+error', requestUrl.origin)
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Handle PKCE code exchange
  if (code) {
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        const errorMessage = encodeURIComponent(exchangeError.message);

        if (type === 'recovery') {
          return NextResponse.redirect(
            new URL(`/reset-password?error=${errorMessage}`, requestUrl.origin)
          );
        }

        return NextResponse.redirect(
          new URL(`/verify-email?verified=false&error=${errorMessage}`, requestUrl.origin)
        );
      }

      // If we have a session, pass the tokens via URL hash so client can pick them up
      // This is necessary because server-side session doesn't automatically sync to client
      if (data.session) {
        const accessToken = data.session.access_token;
        const refreshToken = data.session.refresh_token;
        const tokenType = data.session.token_type;
        const expiresIn = data.session.expires_in;
        const expiresAt = data.session.expires_at;

        // Build hash fragment for client to pick up
        const hashParams = new URLSearchParams({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: tokenType || 'bearer',
          expires_in: String(expiresIn || 3600),
          expires_at: String(expiresAt || Math.floor(Date.now() / 1000) + 3600),
          type: type || 'signup',
        });

        // Check the type of callback
        if (type === 'signup') {
          // Email verification callback
          if (data.user?.email_confirmed_at) {
            // Email is now verified - redirect with tokens in hash
            const redirectUrl = new URL('/verify-email', requestUrl.origin);
            redirectUrl.searchParams.set('verified', 'true');
            return NextResponse.redirect(`${redirectUrl.toString()}#${hashParams.toString()}`);
          } else {
            // Email not confirmed yet
            return NextResponse.redirect(
              new URL(`/verify-email?verified=false&error=Email+verification+incomplete`, requestUrl.origin)
            );
          }
        }

        if (type === 'recovery') {
          // Password recovery callback - redirect to reset password page with tokens
          const redirectUrl = new URL('/reset-password', requestUrl.origin);
          return NextResponse.redirect(`${redirectUrl.toString()}#${hashParams.toString()}`);
        }

        // Default: redirect to next page with tokens
        if (data.user?.email_confirmed_at) {
          const redirectUrl = new URL(next, requestUrl.origin);
          return NextResponse.redirect(`${redirectUrl.toString()}#${hashParams.toString()}`);
        } else {
          // Sign out if email not verified
          await supabase.auth.signOut();
          return NextResponse.redirect(
            new URL('/verify-email?verified=false&error=Please+verify+your+email+first', requestUrl.origin)
          );
        }
      }

      // No session returned - handle based on type
      if (type === 'signup') {
        if (data.user?.email_confirmed_at) {
          return NextResponse.redirect(
            new URL(`/verify-email?verified=true`, requestUrl.origin)
          );
        } else {
          return NextResponse.redirect(
            new URL(`/verify-email?verified=false&error=Email+verification+incomplete`, requestUrl.origin)
          );
        }
      }

      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', requestUrl.origin));
      }

      // Default fallback
      return NextResponse.redirect(new URL('/login', requestUrl.origin));

    } catch (err) {
      console.error('Code exchange exception:', err);
      return NextResponse.redirect(
        new URL('/login?error=Authentication+failed', requestUrl.origin)
      );
    }
  }

  // No code - might be a hash-based redirect (handled client-side)
  // Redirect based on type
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', requestUrl.origin));
  }

  if (type === 'signup') {
    return NextResponse.redirect(new URL('/verify-email', requestUrl.origin));
  }

  // Default fallback
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
