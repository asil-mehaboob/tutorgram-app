import { getSession } from '@/lib/auth/storage';

const BASE_URL = process.env.EXPO_PUBLIC_STUDENT_API_URL ?? '';

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code: string } };

type RequestInit_ = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip attaching the session cookie (used for auth endpoints) */
  skipAuth?: boolean;
};

export async function apiRequest<T>(path: string, init?: RequestInit_): Promise<T> {
  const headers: Record<string, string> = { ...init?.headers };

  if (init?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!init?.skipAuth) {
    const token = await getSession();
    if (token) {
      headers['Cookie'] = `authjs.session-token=${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const payload = await response.json().catch(() => null) as ApiResponse<T> | null;

  if (!response.ok) {
    const message =
      payload && !payload.success
        ? payload.error.message
        : 'Request failed. Please try again.';
    const code =
      payload && !payload.success ? payload.error.code : 'REQUEST_FAILED';
    throw new ApiError(message, code, response.status);
  }

  if (!payload || !payload.success) {
    throw new ApiError('Malformed API response', 'MALFORMED_RESPONSE', response.status);
  }

  return payload.data;
}

export function extractSetCookie(headers: Headers, name: string): string | null {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return null;
  for (const part of setCookie.split(',')) {
    const cookie = part.trim();
    if (cookie.startsWith(`${name}=`)) {
      return cookie.split(';')[0].slice(name.length + 1);
    }
  }
  return null;
}

export { BASE_URL };
