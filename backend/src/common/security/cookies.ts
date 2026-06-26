import { Request } from 'express';

export const ACCESS_COOKIE = 'mocoa-access';
export const REFRESH_COOKIE = 'mocoa-refresh';
export const CSRF_COOKIE = 'mocoa-csrf';
export const CSRF_HEADER = 'x-csrf-token';

export function parseCookieHeader(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, pair) => {
    const index = pair.indexOf('=');
    if (index === -1) return acc;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

export function getCookie(request: Request, name: string): string | undefined {
  return parseCookieHeader(request.header('cookie'))[name];
}
