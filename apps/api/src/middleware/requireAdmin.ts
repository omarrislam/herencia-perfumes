import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './error';

// INTERIM (Milestone 1): header-token guard. Milestone 2 replaces the body of this
// middleware with JWT httpOnly-cookie verification + role check. Route definitions stay.
export function requireAdmin(token: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.header('x-admin-token') !== token) {
      return next(new HttpError(401, 'Admin authorization required', 'unauthorized'));
    }
    next();
  };
}
