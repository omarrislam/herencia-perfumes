import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { authCookie } from '../test/auth';
import { Setting } from '../models/Setting';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const ADMIN = authCookie('000000000000000000000001', 'admin');
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

const baseSetting = {
  whatsappNumber: '+201000000000',
  shippingFee: 60,
  hero: { title: 'Old', subtitle: 'Old sub', ctaText: 'Shop', ctaLink: '/products', image: 'x/hero' },
};

describe('admin settings (home CMS)', () => {
  it('403s a customer', async () => {
    const res = await request(app)
      .put('/api/admin/settings')
      .set('Cookie', authCookie('000000000000000000000002', 'customer'))
      .send({ hero: { title: 'Hacked' } });
    expect(res.status).toBe(403);
  });

  it('updates hero + section toggles + instapay and persists (partial-safe)', async () => {
    await Setting.create(baseSetting);
    const res = await request(app)
      .put('/api/admin/settings')
      .set('Cookie', ADMIN)
      .send({
        hero: { title: 'New Title', image: 'x/new-hero' },
        homeSections: { quiz: false },
        instapay: { enabled: true, handle: 'omarislamelsady@instapay' },
      })
      .expect(200);
    // partial hero update must not clobber the untouched subtitle
    expect(res.body.hero.title).toBe('New Title');
    expect(res.body.hero.image).toBe('x/new-hero');
    expect(res.body.hero.subtitle).toBe('Old sub');
    expect(res.body.homeSections.quiz).toBe(false);
    expect(res.body.homeSections.featured).toBe(true);
    expect(res.body.instapay.enabled).toBe(true);
    expect(res.body.instapay.handle).toBe('omarislamelsady@instapay');

    // GET reflects the persisted change
    const pub = await request(app).get('/api/settings').expect(200);
    expect(pub.body.hero.title).toBe('New Title');
    expect(pub.body.homeSections.quiz).toBe(false);
    expect(pub.body.instapay.handle).toBe('omarislamelsady@instapay');
  });

  it('defaults homeSections to all-true for a setting saved without them', async () => {
    await Setting.create(baseSetting);
    const pub = await request(app).get('/api/settings').expect(200);
    expect(pub.body.homeSections).toEqual({ hero: true, essence: true, featured: true, gifting: true, craft: true, time: true, testimonials: true, values: true, quiz: true, faq: true });
    expect(pub.body.instapay.enabled).toBe(false);
  });
});
