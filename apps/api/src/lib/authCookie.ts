import type { Response } from 'express';

export const AUTH_COOKIE = 'herencia_token';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// In production the web and API can live on different domains (e.g. two Vercel
// projects), so the auth cookie must be cross-site: SameSite=None + Secure.
const isProd = () => process.env['NODE_ENV'] === 'production';

export function setAuthCookie(res: Response, token: string): void {
  const prod = isProd();
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: prod ? 'none' : 'lax',
    secure: prod,
    maxAge: MAX_AGE,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  const prod = isProd();
  res.clearCookie(AUTH_COOKIE, { path: '/', sameSite: prod ? 'none' : 'lax', secure: prod });
}
