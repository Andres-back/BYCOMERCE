import { ApiEnvelope } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    next: token ? undefined : { revalidate: 60 },
  });

  const body = (await response.json()) as ApiEnvelope<T> | { message?: string };
  if (!response.ok) {
    throw new ApiError('message' in body && body.message ? String(body.message) : 'API error', response.status);
  }

  return (body as ApiEnvelope<T>).data;
}

export async function apiPost<T, TBody = unknown>(path: string, body: TBody, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as ApiEnvelope<T> | { message?: string };
  if (!response.ok) {
    throw new ApiError(
      'message' in payload && payload.message ? String(payload.message) : 'API error',
      response.status,
    );
  }

  return (payload as ApiEnvelope<T>).data;
}

export async function apiPatch<T, TBody = unknown>(path: string, body: TBody, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as ApiEnvelope<T> | { message?: string };
  if (!response.ok) {
    throw new ApiError(
      'message' in payload && payload.message ? String(payload.message) : 'API error',
      response.status,
    );
  }

  return (payload as ApiEnvelope<T>).data;
}

export async function apiDelete<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T> | { message?: string };
  if (!response.ok) {
    throw new ApiError(
      'message' in payload && payload.message ? String(payload.message) : 'API error',
      response.status,
    );
  }

  return (payload as ApiEnvelope<T>).data;
}
