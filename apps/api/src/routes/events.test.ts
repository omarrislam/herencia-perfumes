import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Event } from '../models/Event';
import { Session } from '../models/Session';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

async function makeProduct() {
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  return Product.create({
    name: 'Ashes',
    slug: 'ashes',
    type: 'perfume',
    shortDesc: 'x',
    description: 'x',
    images: ['img'],
    sizes: [{ label: '55ml', price: 500, stock: 5 }],
    scentFamily: fam._id,
    gender: 'unisex',
    concentration: 'EDP',
    isActive: true,
  });
}

const body = (over: Record<string, unknown> = {}) => ({
  session: { sessionId: 'S1', visitorId: 'V1', landingPath: '/' },
  events: [{ type: 'page_view', path: '/' }],
  ...over,
});

describe('POST /api/events', () => {
  it('stores the session and its events', async () => {
    await request(app).post('/api/events').set('User-Agent', CHROME).send(body()).expect(204);
    expect(await Session.countDocuments({ sessionId: 'S1' })).toBe(1);
    expect(await Event.countDocuments({ type: 'page_view' })).toBe(1);
  });

  it('keeps the first UTMs when a later batch arrives without them', async () => {
    await request(app)
      .post('/api/events')
      .set('User-Agent', CHROME)
      .send(
        body({
          session: { sessionId: 'S1', visitorId: 'V1', landingPath: '/', utm: { source: 'instagram' } },
        }),
      )
      .expect(204);
    await request(app).post('/api/events').set('User-Agent', CHROME).send(body()).expect(204);
    const s = await Session.findOne({ sessionId: 'S1' }).lean();
    expect(s!.utm?.source).toBe('instagram');
  });

  it('derives add_to_cart value from the database, ignoring any client value', async () => {
    await makeProduct();
    await request(app)
      .post('/api/events')
      .set('User-Agent', CHROME)
      .send(
        body({
          events: [{ type: 'add_to_cart', path: '/products/ashes', productSlug: 'ashes', value: 999999 }],
        }),
      )
      .expect(204);
    const e = await Event.findOne({ type: 'add_to_cart' }).lean();
    expect(e!.value).toBe(500);
  });

  it('drops an event whose product slug matches nothing', async () => {
    await request(app)
      .post('/api/events')
      .set('User-Agent', CHROME)
      .send(body({ events: [{ type: 'product_view', path: '/products/ghost', productSlug: 'ghost' }] }))
      .expect(204);
    expect(await Event.countDocuments()).toBe(0);
  });

  it('flags a crawler session so it can be excluded from reports', async () => {
    await request(app).post('/api/events').set('User-Agent', 'Googlebot/2.1').send(body()).expect(204);
    const s = await Session.findOne({ sessionId: 'S1' }).lean();
    expect(s!.isBot).toBe(true);
  });

  it('records device from the user-agent, not the client', async () => {
    await request(app)
      .post('/api/events')
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148')
      .send(body())
      .expect(204);
    const s = await Session.findOne({ sessionId: 'S1' }).lean();
    expect(s!.device).toBe('mobile');
  });

  it('rejects a malformed batch with 400', async () => {
    await request(app)
      .post('/api/events')
      .set('User-Agent', CHROME)
      .send({ session: { sessionId: 'S1' }, events: [] })
      .expect(400);
  });

  it('never stores PII even if the client sends it', async () => {
    await request(app)
      .post('/api/events')
      .set('User-Agent', CHROME)
      .send(
        body({
          session: {
            sessionId: 'S1',
            visitorId: 'V1',
            landingPath: '/',
            phone: '01012345678',
            email: 'a@b.c',
          },
        }),
      )
      .expect(204);
    const s = await Session.findOne({ sessionId: 'S1' }).lean();
    expect(JSON.stringify(s)).not.toContain('01012345678');
    expect(JSON.stringify(s)).not.toContain('a@b.c');
  });

  it('bumps lastSeenAt on a repeat batch without duplicating the session', async () => {
    await request(app).post('/api/events').set('User-Agent', CHROME).send(body()).expect(204);
    const first = await Session.findOne({ sessionId: 'S1' }).lean();
    await new Promise((r) => setTimeout(r, 10));
    await request(app).post('/api/events').set('User-Agent', CHROME).send(body()).expect(204);
    const second = await Session.findOne({ sessionId: 'S1' }).lean();
    expect(await Session.countDocuments()).toBe(1);
    expect(new Date(second!.lastSeenAt!).getTime()).toBeGreaterThan(new Date(first!.lastSeenAt!).getTime());
  });

  it('does not attach a value to a plain product_view', async () => {
    await makeProduct();
    await request(app)
      .post('/api/events')
      .set('User-Agent', CHROME)
      .send(body({ events: [{ type: 'product_view', path: '/products/ashes', productSlug: 'ashes' }] }))
      .expect(204);
    const e = await Event.findOne({ type: 'product_view' }).lean();
    expect(e!.product).toBeTruthy();
    expect(e!.value == null).toBe(true);
  });
  it('accepts a text/plain body — that is what navigator.sendBeacon sends', async () => {
    // Regression: a string beacon body is labelled text/plain, which the app-level
    // express.json() ignores. Sending application/json instead is not an option:
    // cross-origin it would need a preflight, and sendBeacon cannot preflight.
    await request(app)
      .post('/api/events')
      .set('User-Agent', CHROME)
      .set('Content-Type', 'text/plain;charset=UTF-8')
      .send(JSON.stringify(body()))
      .expect(204);
    expect(await Session.countDocuments({ sessionId: 'S1' })).toBe(1);
    expect(await Event.countDocuments({ type: 'page_view' })).toBe(1);
  });

  it('still rejects a text/plain body that is not valid json', async () => {
    await request(app)
      .post('/api/events')
      .set('User-Agent', CHROME)
      .set('Content-Type', 'text/plain;charset=UTF-8')
      .send('not json at all')
      .expect(400);
  });
});
