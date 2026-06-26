import { NextFunction, Request, Response } from 'express';
import { ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER, parseCookieHeader, REFRESH_COOKIE } from '../security/cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_PATHS = ['/api/v1/auth/login', '/auth/login'];

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  if (CSRF_EXEMPT_PATHS.some((path) => req.originalUrl.startsWith(path) || req.url.startsWith(path))) {
    next();
    return;
  }

  const cookies = parseCookieHeader(req.header('cookie'));
  const hasSessionCookie = Boolean(cookies[ACCESS_COOKIE] || cookies[REFRESH_COOKIE]);
  if (!hasSessionCookie) {
    next();
    return;
  }

  const csrfCookie = cookies[CSRF_COOKIE];
  const csrfHeader = req.header(CSRF_HEADER);
  if (csrfCookie && csrfHeader && csrfCookie === csrfHeader) {
    next();
    return;
  }

  res.status(403).json({
    statusCode: 403,
    error: 'CSRF_TOKEN_INVALID',
    message: 'Token CSRF invalido o ausente',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
}
