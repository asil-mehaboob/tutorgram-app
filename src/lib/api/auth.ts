import { BASE_URL, ApiError, extractSetCookie, apiRequest } from './client';

export type MeResponseData = {
  identity: {
    id: string;
    email: string;
    fullName: string | null;
    profilePicture: string | null;
    role: string;
  };
  session: {
    id: string;
    email: string | null;
    name: string | null;
    role: string;
  };
};

/** Credentials login — returns the session token cookie value. */
export async function login(email: string, password: string): Promise<string> {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const csrfData = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookie =
    extractSetCookie(csrfRes.headers, 'authjs.csrf-token') ??
    extractSetCookie(csrfRes.headers, '__Host-authjs.csrf-token') ??
    '';

  const body = new URLSearchParams({
    email,
    password,
    csrfToken: csrfData.csrfToken,
    redirect: 'false',
    json: 'true',
  });

  const signInRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookie ? `authjs.csrf-token=${csrfCookie}` : '',
    },
    body: body.toString(),
    redirect: 'manual',
  });

  const sessionToken =
    extractSetCookie(signInRes.headers, 'authjs.session-token') ??
    extractSetCookie(signInRes.headers, '__Secure-authjs.session-token') ??
    extractSetCookie(signInRes.headers, 'next-auth.session-token');

  if (!sessionToken) {
    throw new ApiError('Invalid email or password.', 'INVALID_CREDENTIALS', 401);
  }
  return sessionToken;
}

/**
 * Google OAuth — opens the NextAuth Google sign-in URL in a web browser.
 * Returns the session token extracted from the redirect callback URL.
 */
export async function loginWithGoogle(
  openAuthSession: (url: string, redirectUrl: string) => Promise<{ type: string; url?: string } | null>
): Promise<string> {
  const redirectUrl = 'tutorgramapp://auth/callback';
  const googleSignInUrl = `${BASE_URL}/api/auth/signin/google?callbackUrl=${encodeURIComponent(redirectUrl)}`;

  const result = await openAuthSession(googleSignInUrl, redirectUrl);

  if (!result || result.type !== 'success' || !result.url) {
    throw new ApiError('Google sign-in was cancelled.', 'GOOGLE_CANCELLED', 0);
  }

  // After successful OAuth, the backend sets a session cookie.
  // Fetch the session directly.
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: '' },
    credentials: 'include',
  });

  const sessionToken =
    extractSetCookie(sessionRes.headers, 'authjs.session-token') ??
    extractSetCookie(sessionRes.headers, '__Secure-authjs.session-token');

  if (!sessionToken) {
    throw new ApiError(
      'Could not retrieve session after Google sign-in.',
      'SESSION_NOT_FOUND',
      0
    );
  }
  return sessionToken;
}

export async function getMe(): Promise<MeResponseData> {
  return apiRequest<MeResponseData>('/api/me');
}

export async function sendOtp(phone: string): Promise<void> {
  await apiRequest<{ message: string }>('/api/auth/send-otp', {
    method: 'POST',
    body: { phone },
    skipAuth: true,
  });
}

export async function verifyOtp(phone: string, otp: string): Promise<string> {
  const data = await apiRequest<{ verifiedTokenId: string }>('/api/auth/verify-otp', {
    method: 'POST',
    body: { phone, otp },
    skipAuth: true,
  });
  return data.verifiedTokenId;
}

export async function register(payload: {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  verifiedTokenId: string;
}): Promise<void> {
  await apiRequest('/api/auth/register', {
    method: 'POST',
    body: payload,
    skipAuth: true,
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: { email },
    skipAuth: true,
  });
}
