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
    expect(pub.body.homeSections).toEqual({ hero: true, featured: true, samples: true, essence: true, gifting: true, time: true, testimonials: true, values: true, quiz: true, faq: true });
    expect(pub.body.instapay.enabled).toBe(false);
  });

  it('serves the sales-first default order for a stored order without samples, honors one with it', async () => {
    await Setting.create({ ...baseSetting, sectionOrder: ['faq', 'essence', 'featured'] });
    const pub = await request(app).get('/api/settings').expect(200);
    // pre-'samples' orders are treated as unmigrated → new default
    expect(pub.body.sectionOrder.slice(0, 2)).toEqual(['featured', 'samples']);

    await Setting.updateOne({}, { $set: { sectionOrder: ['samples', 'faq', 'featured'] } });
    const pub2 = await request(app).get('/api/settings').expect(200);
    expect(pub2.body.sectionOrder.slice(0, 3)).toEqual(['samples', 'faq', 'featured']);
  });

  it('updates the email popup and exposes it publicly', async () => {
    await Setting.create(baseSetting);
    const res = await request(app)
      .put('/api/admin/settings')
      .set('Cookie', ADMIN)
      .send({ emailPopup: { enabled: true, code: 'WELCOME10', discountPercent: 10 } })
      .expect(200);
    expect(res.body.emailPopup).toMatchObject({ enabled: true, code: 'WELCOME10', discountPercent: 10 });
    const pub = await request(app).get('/api/settings').expect(200);
    expect(pub.body.emailPopup.code).toBe('WELCOME10');
  });

  it('partially updates samples settings without clobbering siblings', async () => {
    await Setting.create(baseSetting);
    const res = await request(app).put('/api/admin/settings').set('Cookie', ADMIN)
      .send({ samples: { price: 80, sizeLabel: '3ml' } });
    expect(res.status).toBe(200);
    expect(res.body.samples.price).toBe(80);
    expect(res.body.samples.sizeLabel).toBe('3ml');
    expect(res.body.samples.modalTitle).toBe('Order samples'); // default preserved
  });
});
