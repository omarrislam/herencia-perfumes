import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';
import { StockNotification } from '../models/StockNotification';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

async function makeProduct(stock: number, extra: Record<string, unknown> = {}) {
  const fam = await ScentFamily.create({ name: 'Floral', slug: 'floral', order: 1 });
  return Product.create({
    name: 'Perla Rosa',
    slug: 'perla-rosa',
    type: 'perfume',
    shortDesc: 'x',
    description: 'x',
    images: ['img'],
    sizes: [{ label: '55ml', price: 500, stock }],
    scentFamily: fam._id,
    gender: 'women',
    concentration: 'Extrait',
    isActive: true,
    ...extra,
  });
}

const body = { sizeLabel: '55ml', phone: '01012345678' };

describe('POST /api/products/:slug/notify', () => {
  it('records a request when the size is sold out', async () => {
    await makeProduct(0);
    await request(app).post('/api/products/perla-rosa/notify').send(body).expect(201);
    const row = await StockNotification.findOne({}).lean();
    expect(row).toMatchObject({ sizeLabel: '55ml', phone: '01012345678', notified: false });
  });

  it('normalises the phone the same way orders do', async () => {
    await makeProduct(0);
    await request(app)
      .post('/api/products/perla-rosa/notify')
      .send({ ...body, phone: '+20 101 234 5678' })
      .expect(201);
    const row = await StockNotification.findOne({}).lean();
    expect(row!.phone).toBe('01012345678');
  });

  it('is idempotent — asking twice does not duplicate the person', async () => {
    await makeProduct(0);
    await request(app).post('/api/products/perla-rosa/notify').send(body).expect(201);
    await request(app).post('/api/products/perla-rosa/notify').send(body).expect(201);
    expect(await StockNotification.countDocuments()).toBe(1);
  });

  it('refuses when the size is actually in stock — there is nothing to wait for', async () => {
    await makeProduct(5);
    const res = await request(app).post('/api/products/perla-rosa/notify').send(body).expect(409);
    expect(res.body.error.code).toBe('in_stock');
    expect(await StockNotification.countDocuments()).toBe(0);
  });

  it('404s an unknown product', async () => {
    await makeProduct(0);
    await request(app).post('/api/products/ghost/notify').send(body).expect(404);
  });

  it('404s a size the product does not have', async () => {
    await makeProduct(0);
    await request(app)
      .post('/api/products/perla-rosa/notify')
      .send({ ...body, sizeLabel: '100ml' })
      .expect(404);
  });

  it('never exposes an inactive product', async () => {
    await makeProduct(0, { isActive: false });
    await request(app).post('/api/products/perla-rosa/notify').send(body).expect(404);
  });

  it('rejects a non-Egyptian phone number', async () => {
    await makeProduct(0);
    await request(app)
      .post('/api/products/perla-rosa/notify')
      .send({ ...body, phone: '12345' })
      .expect(400);
  });

  it('stores an optional email but treats an empty string as absent', async () => {
    await makeProduct(0);
    await request(app)
      .post('/api/products/perla-rosa/notify')
      .send({ ...body, email: '' })
      .expect(201);
    const row = await StockNotification.findOne({}).lean();
    expect(row!.email == null || row!.email === '').toBe(true);
  });
});
