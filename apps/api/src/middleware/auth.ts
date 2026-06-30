import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpError } from './error';
import { verifyToken } from '../lib/jwt';
import { AUTH_COOKIE } from '../lib/authCookie';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: 'customer' | 'admin' };
    }
  }
}

export const authenticate: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE];
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = { id: payload.sub, role: payload.role };
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Authentication required', 'unauthorized'));
  next();
};

export function requireRole(role: 'customer' | 'admin'): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Authentication required', 'unauthorized'));
    if (req.user.role !== role) return next(new HttpError(403, 'Forbidden', 'forbidden'));
    next();
  };
}
