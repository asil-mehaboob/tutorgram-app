import { TUTOR_BASE_URL, TutorApiError, extractTutorSetCookie, tutorApiRequest } from './tutor-client';
import type { MeResponseData } from './auth';

/** Credentials login — returns the session token cookie value. */
export async function tutorLogin(email: string, password: string): Promise<string> {
  const csrfRes = await fetch(`${TUTOR_BASE_URL}/api/auth/csrf`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const csrfData = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookie =
    extractTutorSetCookie(csrfRes.headers, 'authjs.csrf-token') ??
    extractTutorSetCookie(csrfRes.headers, '__Host-authjs.csrf-token') ??
    '';

  const body = new URLSearchParams({
    email,
    password,
    csrfToken: csrfData.csrfToken,
    redirect: 'false',
    json: 'true',
  });

  const signInRes = await fetch(`${TUTOR_BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookie ? `authjs.csrf-token=${csrfCookie}` : '',
    },
    body: body.toString(),
    redirect: 'manual',
  });

  const sessionToken =
    extractTutorSetCookie(signInRes.headers, 'authjs.session-token') ??
    extractTutorSetCookie(signInRes.headers, '__Secure-authjs.session-token') ??
    extractTutorSetCookie(signInRes.headers, 'next-auth.session-token');

  if (!sessionToken) {
    throw new TutorApiError('Invalid email or password.', 'INVALID_CREDENTIALS', 401);
  }
  return sessionToken;
}

export async function tutorLoginWithGoogle(
  openAuthSession: (url: string, redirectUrl: string) => Promise<{ type: string; url?: string } | null>
): Promise<string> {
  const redirectUrl = 'tutorgramapp://auth/callback';
  const googleSignInUrl = `${TUTOR_BASE_URL}/api/auth/signin/google?callbackUrl=${encodeURIComponent(redirectUrl)}`;

  const result = await openAuthSession(googleSignInUrl, redirectUrl);

  if (!result || result.type !== 'success' || !result.url) {
    throw new TutorApiError('Google sign-in was cancelled.', 'GOOGLE_CANCELLED', 0);
  }

  const sessionRes = await fetch(`${TUTOR_BASE_URL}/api/auth/session`, {
    headers: { Cookie: '' },
    credentials: 'include',
  });

  const sessionToken =
    extractTutorSetCookie(sessionRes.headers, 'authjs.session-token') ??
    extractTutorSetCookie(sessionRes.headers, '__Secure-authjs.session-token');

  if (!sessionToken) {
    throw new TutorApiError(
      'Could not retrieve session after Google sign-in.',
      'SESSION_NOT_FOUND',
      0
    );
  }
  return sessionToken;
}

export async function tutorGetMe(sessionToken?: string): Promise<MeResponseData> {
  return tutorApiRequest<MeResponseData>('/api/me', sessionToken ? { token: sessionToken } : undefined);
}

export async function tutorSendOtp(phone: string): Promise<void> {
  await tutorApiRequest<{ message: string }>('/api/auth/send-otp', {
    method: 'POST',
    body: { phone },
    skipAuth: true,
  });
}

export async function tutorVerifyOtp(phone: string, otp: string): Promise<string> {
  const data = await tutorApiRequest<{ verifiedTokenId: string }>('/api/auth/verify-otp', {
    method: 'POST',
    body: { phone, otp },
    skipAuth: true,
  });
  return data.verifiedTokenId;
}

export async function tutorRegister(payload: {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  verifiedTokenId: string;
  applyForBrand?: boolean;
}): Promise<void> {
  await tutorApiRequest('/api/auth/register', {
    method: 'POST',
    body: payload,
    skipAuth: true,
  });
}

export async function tutorForgotPassword(email: string): Promise<void> {
  await tutorApiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: { email },
    skipAuth: true,
  });
}
