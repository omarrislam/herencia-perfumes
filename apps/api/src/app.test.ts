import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(createApp({ clientOrigin: 'http://localhost:5173', adminToken: 'test-admin-token-1234' })).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 404 JSON for unknown api route', async () => {
    const res = await request(createApp({ clientOrigin: 'http://localhost:5173', adminToken: 'test-admin-token-1234' })).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
