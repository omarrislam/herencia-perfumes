import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Setting } from '../models/Setting';
import { Subscriber } from '../models/Subscriber';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

const baseSetting = {
  whatsappNumber: '+201000000000',
  shippingFee: 60,
  hero: { title: 't', subtitle: 's', ctaText: 'c', ctaLink: '/', image: 'x' },
};

describe('POST /api/newsletter', () => {
  it('stores the email and returns the popup discount code', async () => {
    await Setting.create({ ...baseSetting, emailPopup: { enabled: true, code: 'WELCOME10', discountPercent: 10 } });
    const res = await request(app).post('/api/newsletter').send({ email: 'Mai@Example.com' }).expect(201);
    expect(res.body).toMatchObject({ ok: true, code: 'WELCOME10', discountPercent: 10 });
    const sub = await Subscriber.findOne({ email: 'mai@example.com' }).lean();
    expect(sub).not.toBeNull();
  });

  it('is idempotent on duplicate email and still returns the code', async () => {
    await Setting.create({ ...baseSetting, emailPopup: { enabled: true, code: 'WELCOME10', discountPercent: 10 } });
    await request(app).post('/api/newsletter').send({ email: 'mai@example.com' }).expect(201);
    const res = await request(app).post('/api/newsletter').send({ email: 'mai@example.com' }).expect(201);
    expect(res.body.code).toBe('WELCOME10');
    expect(await Subscriber.countDocuments()).toBe(1);
  });

  it('rejects an invalid email and returns null code when the popup is disabled', async () => {
    await Setting.create(baseSetting);
    await request(app).post('/api/newsletter').send({ email: 'not-an-email' }).expect(400);
    const res = await request(app).post('/api/newsletter').send({ email: 'mai@example.com' }).expect(201);
    expect(res.body.code).toBeNull();
  });
});
