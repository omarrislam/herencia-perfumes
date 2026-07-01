import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { makeLimiter } from './rateLimit';

describe('makeLimiter', () => {
  it('returns 429 after the limit (when not skipped)', async () => {
    const app = express();
    app.use('/x', makeLimiter({ windowMs: 1000, max: 2, skipTest: false }), (_req, res) => res.json({ ok: true }));
    await request(app).get('/x').expect(200);
    await request(app).get('/x').expect(200);
    const res = await request(app).get('/x').expect(429);
    expect(res.body.error.code).toBe('rate_limited');
  });
});
