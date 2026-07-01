import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Banner } from '../models/Banner';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

describe('GET /api/banners', () => {
  it('returns only active banners within their schedule window, by placement, ordered', async () => {
    const now = Date.now();
    await Banner.create({ title: 'Live', image: 'x', placement: 'home_hero', isActive: true, order: 2 });
    await Banner.create({ title: 'First', image: 'x', placement: 'home_hero', isActive: true, order: 1 });
    await Banner.create({ title: 'Inactive', image: 'x', placement: 'home_hero', isActive: false, order: 0 });
    await Banner.create({ title: 'Future', image: 'x', placement: 'home_hero', isActive: true, startsAt: new Date(now + 1e7) });
    await Banner.create({ title: 'Expired', image: 'x', placement: 'home_hero', isActive: true, endsAt: new Date(now - 1e7) });
    await Banner.create({ title: 'OtherPlacement', image: 'x', placement: 'global_top', isActive: true });

    const res = await request(app).get('/api/banners?placement=home_hero');
    expect(res.status).toBe(200);
    expect(res.body.map((b: { title: string }) => b.title)).toEqual(['First', 'Live']);
  });
  it('returns all active current banners when no placement is given', async () => {
    await Banner.create({ title: 'A', image: 'x', placement: 'home_hero', isActive: true });
    await Banner.create({ title: 'B', image: 'x', placement: 'global_top', isActive: true });
    const res = await request(app).get('/api/banners');
    expect(res.body).toHaveLength(2);
  });
});
