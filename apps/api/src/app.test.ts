import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(createApp({ clientOrigin: 'http://localhost:5173' })).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 404 JSON for unknown api route', async () => {
    const res = await request(createApp({ clientOrigin: 'http://localhost:5173' })).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('sends a content-security-policy header', async () => {
    const app = createApp({ clientOrigin: 'http://localhost:5173' });
    const res = await request(app).get('/api/health').expect(200);
    const csp = res.headers['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('res.cloudinary.com');
  });
});
