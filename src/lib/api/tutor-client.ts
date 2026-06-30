import { getSession } from '@/lib/auth/storage';

const TUTOR_BASE_URL = process.env.EXPO_PUBLIC_TUTOR_API_URL ?? '';

export class TutorApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'TutorApiError';
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
  skipAuth?: boolean;
  token?: string;
};

export async function tutorApiRequest<T>(path: string, init?: RequestInit_): Promise<T> {
  const headers: Record<string, string> = { ...init?.headers };

  if (init?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!init?.skipAuth) {
    const token = init?.token ?? await getSession();
    if (token) {
      headers['Cookie'] = `authjs.session-token=${token}; __Secure-authjs.session-token=${token}`;
    }
  }

  const url = `${TUTOR_BASE_URL}${path}`;
  console.log('[TutorAPI] -->', init?.method ?? 'GET', url, { headers: { ...headers, Cookie: headers['Cookie'] ? '[redacted]' : undefined } });

  const response = await fetch(url, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const rawText = await response.text();
  console.log('[TutorAPI] <--', response.status, path, rawText.slice(0, 300));

  const payload = (() => { try { return JSON.parse(rawText) as ApiResponse<T>; } catch { return null; } })();

  if (!response.ok) {
    const message =
      payload && !payload.success
        ? payload.error.message
        : 'Request failed. Please try again.';
    const code =
      payload && !payload.success ? payload.error.code : 'REQUEST_FAILED';
    throw new TutorApiError(message, code, response.status);
  }

  if (!payload || !payload.success) {
    throw new TutorApiError('Malformed API response', 'MALFORMED_RESPONSE', response.status);
  }

  return payload.data;
}

export function extractTutorSetCookie(headers: Headers, name: string): string | null {
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

export { TUTOR_BASE_URL };
