import { ApiEnvelope } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const CSRF_COOKIE = 'mocoa-csrf';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function csrfHeaders(): HeadersInit {
  const csrf = getCookie(CSRF_COOKIE);
  return csrf ? { 'X-CSRF-Token': decodeURIComponent(csrf) } : {};
}

async function refreshSession(): Promise<boolean> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(),
    },
    body: JSON.stringify({}),
  });
  return response.ok;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T> | { message?: string };
  if (!response.ok) {
    throw new ApiError('message' in payload && payload.message ? String(payload.message) : 'API error', response.status);
  }
  return (payload as ApiEnvelope<T>).data;
}

async function request<T>(path: string, init: RequestInit, retry = true): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
  });

  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, init, false);
  }

  return parseResponse<T>(response);
}

export async function apiGet<T>(path: string, _token?: string): Promise<T> {
  return request<T>(path, {
    method: 'GET',
    next: { revalidate: 60 },
  });
}

export async function apiPost<T, TBody = unknown>(path: string, body: TBody, _token?: string): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(),
    },
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T, TBody = unknown>(path: string, body: TBody, _token?: string): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(),
    },
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(path: string, _token?: string): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
    headers: {
      ...csrfHeaders(),
    },
  });
}
