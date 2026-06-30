import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Setting } from '../models/Setting';

const app = createApp({ clientOrigin: 'http://localhost:5173', adminToken: 'test-admin-token-1234' });

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

describe('GET /api/settings', () => {
  it('returns the public settings subset', async () => {
    await Setting.create({
      whatsappNumber: '+201234567890',
      shippingFee: 60,
      hero: { title: 'H', subtitle: 'S', ctaText: 'Shop', ctaLink: '/products', image: 'herencia/hero' },
    });
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.whatsappNumber).toBe('+201234567890');
    expect(res.body.hero.title).toBe('H');
    expect(res.body._id).toBeUndefined();
  });
  it('returns 404 when settings are not seeded', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(404);
  });
});
