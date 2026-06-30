import { describe, it, expect } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { authenticate, requireAuth, requireRole } from './auth';
import { errorHandler } from './error';
import { authCookie } from '../test/auth';

function appWith(handler: express.RequestHandler) {
  const app = express();
  app.use(cookieParser());
  app.get('/p', authenticate, handler, (req, res) => res.json({ id: req.user?.id, role: req.user?.role }));
  app.use(errorHandler);
  return app;
}

describe('auth middleware', () => {
  it('401s requireAuth without a cookie', async () => {
    const res = await request(appWith(requireAuth)).get('/p');
    expect(res.status).toBe(401);
  });
  it('passes requireAuth with a valid cookie', async () => {
    const res = await request(appWith(requireAuth)).get('/p').set('Cookie', authCookie('u1', 'customer'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'u1', role: 'customer' });
  });
  it('403s requireRole admin for a customer', async () => {
    const res = await request(appWith(requireRole('admin'))).get('/p').set('Cookie', authCookie('u1', 'customer'));
    expect(res.status).toBe(403);
  });
});
