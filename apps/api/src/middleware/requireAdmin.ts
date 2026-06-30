import type { RequestHandler } from 'express';
import { authenticate, requireRole } from './auth';

// Milestone 2: same seam name, JWT-cookie + admin-role internals (replaces the interim
// x-admin-token check). Mount as `router.use(requireAdmin)`.
const adminRole = requireRole('admin');
export const requireAdmin: RequestHandler = (req, res, next) => {
  authenticate(req, res, (err?: unknown) => {
    if (err) return next(err as Error);
    adminRole(req, res, next);
  });
};
