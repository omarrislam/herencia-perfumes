import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const ADMIN = authCookie('000000000000000000000001', 'admin');
const CUSTOMER = authCookie('000000000000000000000002', 'customer');

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

async function seedOrder(status = 'pending') {
  return Order.create({
    orderNumber: `HRC-${status}-${Math.random().toString(36).slice(2, 6)}`,
    items: [{ product: '000000000000000000000099', name: 'X', sizeLabel: '50ml', unitPrice: 800, qty: 1, image: '' }],
    customer: { name: 'Mai', phone: '01000000000' },
    shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
    subtotal: 800, shipping: 50, total: 850, status, paymentMethod: 'cod',
  });
}

describe('GET /api/admin/orders', () => {
  it('403s for a customer', async () => {
    expect((await request(app).get('/api/admin/orders').set('Cookie', CUSTOMER)).status).toBe(403);
  });
  it('lists orders and filters by status', async () => {
    await seedOrder('pending');
    await seedOrder('shipped');
    const all = await request(app).get('/api/admin/orders').set('Cookie', ADMIN);
    expect(all.body.total).toBe(2);
    const shipped = await request(app).get('/api/admin/orders?status=shipped').set('Cookie', ADMIN);
    expect(shipped.body.total).toBe(1);
    expect(shipped.body.items[0].status).toBe('shipped');
  });
  it('?status=banana returns 400 (M2-min-17)', async () => {
    const res = await request(app).get('/api/admin/orders?status=banana').set('Cookie', ADMIN);
    expect(res.status).toBe(400);
  });
  it('?q= searches order number, customer name, and phone', async () => {
    const o = await seedOrder('pending');
    await seedOrder('shipped');
    const byNumber = await request(app).get(`/api/admin/orders?q=${o.orderNumber}`).set('Cookie', ADMIN);
    expect(byNumber.body.total).toBe(1);
    expect(byNumber.body.items[0].orderNumber).toBe(o.orderNumber);
    const byName = await request(app).get('/api/admin/orders?q=mai').set('Cookie', ADMIN);
    expect(byName.body.total).toBe(2);
    const byPhone = await request(app).get('/api/admin/orders?q=01000000000').set('Cookie', ADMIN);
    expect(byPhone.body.total).toBe(2);
    const miss = await request(app).get('/api/admin/orders?q=nope').set('Cookie', ADMIN);
    expect(miss.body.total).toBe(0);
  });
});

describe('PUT /api/admin/orders/:id/status', () => {
  it('advances pending → confirmed', async () => {
    const o = await seedOrder('pending');
    const res = await request(app).put(`/api/admin/orders/${o._id}/status`).set('Cookie', ADMIN).send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });
  it('rejects an illegal transition delivered → pending with 422', async () => {
    const o = await seedOrder('delivered');
    const res = await request(app).put(`/api/admin/orders/${o._id}/status`).set('Cookie', ADMIN).send({ status: 'pending' });
    expect(res.status).toBe(422);
  });
  it('404s an unknown order id', async () => {
    const res = await request(app).put('/api/admin/orders/000000000000000000000abc/status').set('Cookie', ADMIN).send({ status: 'confirmed' });
    expect(res.status).toBe(404);
  });
  it('same-status no-op transition succeeds with 200 (M2-min-17)', async () => {
    const o = await seedOrder('pending');
    const res = await request(app).put(`/api/admin/orders/${o._id}/status`).set('Cookie', ADMIN).send({ status: 'pending' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
  });
  it('records each transition in statusHistory', async () => {
    const o = await seedOrder('pending');
    await request(app).put(`/api/admin/orders/${o._id}/status`).set('Cookie', ADMIN).send({ status: 'confirmed' });
    const res = await request(app).put(`/api/admin/orders/${o._id}/status`).set('Cookie', ADMIN).send({ status: 'shipped' });
    expect(res.body.statusHistory.map((h: { status: string }) => h.status)).toEqual(['confirmed', 'shipped']);
    expect(res.body.statusHistory[0].at).toBeTruthy();
  });
  it('cancelling restores the reserved stock', async () => {
    const p = await Product.create({
      name: 'Amber', type: 'perfume', shortDesc: 's', description: 'd', images: ['i'],
      sizes: [{ label: '50ml', price: 800, stock: 2 }],
      scentFamily: '000000000000000000000010',
      notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
    });
    const o = await Order.create({
      orderNumber: 'HRC-CANCEL-1',
      items: [{ product: p._id, name: 'Amber', sizeLabel: '50ml', unitPrice: 800, qty: 2, image: '' }],
      customer: { name: 'Mai', phone: '01000000000' },
      shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
      subtotal: 1600, shipping: 50, total: 1650, status: 'pending', paymentMethod: 'cod',
    });
    const res = await request(app).put(`/api/admin/orders/${o._id}/status`).set('Cookie', ADMIN).send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    const after = await Product.findById(p._id).lean();
    expect(after!.sizes[0]!.stock).toBe(4); // 2 on shelf + 2 restored
  });

  it('cancelling restores sampleStock for sample items', async () => {
    const p = await Product.create({
      name: 'Amber', type: 'perfume', shortDesc: 's', description: 'd', images: ['i'],
      sizes: [{ label: '50ml', price: 800, stock: 2 }],
      scentFamily: '000000000000000000000010',
      notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
      sampleStock: 3,
    });
    const o = await Order.create({
      orderNumber: 'HRC-CANCEL-2',
      items: [{ product: p._id, name: 'Amber', sizeLabel: 'Sample · 5ml', unitPrice: 60, qty: 2, image: '', isSample: true }],
      customer: { name: 'Mai', phone: '01000000000' },
      shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
      subtotal: 120, shipping: 50, total: 170, status: 'pending', paymentMethod: 'cod',
    });
    const res = await request(app).put(`/api/admin/orders/${o._id}/status`).set('Cookie', ADMIN).send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    const after = await Product.findById(p._id).lean();
    expect(after!.sampleStock).toBe(5); // 3 on shelf + 2 restored
  });
});

describe('PUT /api/admin/orders/:id/paid', () => {
  it('marks an order paid and clears it again', async () => {
    const o = await seedOrder('pending');
    const paid = await request(app).put(`/api/admin/orders/${o._id}/paid`).set('Cookie', ADMIN).send({ paid: true });
    expect(paid.status).toBe(200);
    expect(paid.body.paidAt).toBeTruthy();
    const unpaid = await request(app).put(`/api/admin/orders/${o._id}/paid`).set('Cookie', ADMIN).send({ paid: false });
    expect(unpaid.status).toBe(200);
    expect(unpaid.body.paidAt).toBeUndefined();
  });
  it('400s on an invalid body and 404s an unknown id', async () => {
    const o = await seedOrder('pending');
    expect((await request(app).put(`/api/admin/orders/${o._id}/paid`).set('Cookie', ADMIN).send({ paid: 'yes' })).status).toBe(400);
    expect((await request(app).put('/api/admin/orders/000000000000000000000abc/paid').set('Cookie', ADMIN).send({ paid: true })).status).toBe(404);
  });
});

describe('DELETE /api/admin/orders/:id', () => {
  it('403s for a customer', async () => {
    const o = await seedOrder('cancelled');
    expect((await request(app).delete(`/api/admin/orders/${o._id}`).set('Cookie', CUSTOMER)).status).toBe(403);
  });
  it('deletes a cancelled order and 404s on a second delete', async () => {
    const o = await seedOrder('cancelled');
    const res = await request(app).delete(`/api/admin/orders/${o._id}`).set('Cookie', ADMIN);
    expect(res.status).toBe(204);
    expect(await Order.findById(o._id)).toBeNull();
    const again = await request(app).delete(`/api/admin/orders/${o._id}`).set('Cookie', ADMIN);
    expect(again.status).toBe(404);
  });
  // Deleting never restored stock while cancelling does, so a live order had to
  // go through cancel first or its units vanished from inventory.
  it('refuses to delete a live order with 409 and leaves it in place', async () => {
    for (const status of ['pending', 'confirmed', 'shipped', 'delivered']) {
      const o = await seedOrder(status);
      const res = await request(app).delete(`/api/admin/orders/${o._id}`).set('Cookie', ADMIN);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('cancel_before_delete');
      expect(await Order.findById(o._id)).not.toBeNull();
    }
  });
});

describe('PUT /api/admin/orders/:id (edit delivery details)', () => {
  const edit = {
    customer: { name: 'Mai Hassan', phone: '01111111111' },
    shippingAddress: { line1: '9 Nile St', city: 'Giza', governorate: 'Giza', phone: '01111111111' },
  };

  it('updates customer and address, normalizing the phone', async () => {
    const o = await seedOrder('confirmed');
    const res = await request(app)
      .put(`/api/admin/orders/${o._id}`)
      .set('Cookie', ADMIN)
      .send({ ...edit, customer: { ...edit.customer, phone: '+20 111 111 1111' } });
    expect(res.status).toBe(200);
    expect(res.body.customer).toMatchObject({ name: 'Mai Hassan', phone: '01111111111' });
    expect(res.body.shippingAddress).toMatchObject({ line1: '9 Nile St', city: 'Giza' });
  });

  it('leaves items and money untouched', async () => {
    const o = await seedOrder('confirmed');
    const res = await request(app).put(`/api/admin/orders/${o._id}`).set('Cookie', ADMIN).send(edit);
    expect(res.body.total).toBe(850);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.status).toBe('confirmed');
  });

  it('clears the email when it is submitted empty', async () => {
    const o = await Order.create({
      orderNumber: 'HRC-EMAIL-1',
      items: [{ product: '000000000000000000000099', name: 'X', sizeLabel: '50ml', unitPrice: 800, qty: 1, image: '' }],
      customer: { name: 'Mai', phone: '01000000000', email: 'mai@example.com' },
      shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
      subtotal: 800, shipping: 50, total: 850, status: 'pending', paymentMethod: 'cod',
    });
    const res = await request(app).put(`/api/admin/orders/${o._id}`).set('Cookie', ADMIN).send(edit);
    expect(res.body.customer.email).toBeUndefined();
  });

  it('400s on an invalid phone, 404s an unknown id, 403s a customer', async () => {
    const o = await seedOrder('pending');
    const bad = await request(app)
      .put(`/api/admin/orders/${o._id}`)
      .set('Cookie', ADMIN)
      .send({ ...edit, customer: { ...edit.customer, phone: '12345' } });
    expect(bad.status).toBe(400);
    expect((await request(app).put('/api/admin/orders/000000000000000000000abc').set('Cookie', ADMIN).send(edit)).status).toBe(404);
    expect((await request(app).put(`/api/admin/orders/${o._id}`).set('Cookie', CUSTOMER).send(edit)).status).toBe(403);
  });
});

describe('stale unpaid InstaPay orders', () => {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

  let seq = 0;
  async function seedInstapay(opts: { ageHours: number; paid?: boolean; status?: string }) {
    const name = `Amber ${(seq += 1)}`; // unique — the slug index is unique
    const p = await Product.create({
      name, type: 'perfume', shortDesc: 's', description: 'd', images: ['i'],
      sizes: [{ label: '50ml', price: 800, stock: 1 }],
      scentFamily: '000000000000000000000010',
      notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
    });
    const o = await Order.create({
      orderNumber: `HRC-STALE-${seq}`,
      items: [{ product: p._id, name, sizeLabel: '50ml', unitPrice: 800, qty: 2, image: '' }],
      customer: { name: 'Mai', phone: '01000000000' },
      shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
      subtotal: 1600, shipping: 50, total: 1650,
      status: opts.status ?? 'pending',
      paymentMethod: 'instapay',
      ...(opts.paid ? { paidAt: new Date() } : {}),
    });
    // Mongoose marks timestamps' createdAt immutable, so age the order through
    // the raw driver.
    await Order.collection.updateOne({ _id: o._id }, { $set: { createdAt: hoursAgo(opts.ageHours) } });
    return { order: o, product: p };
  }

  it('counts only unpaid, still-pending InstaPay orders past the window', async () => {
    await seedInstapay({ ageHours: 72 }); // stale
    await seedInstapay({ ageHours: 1 }); // too recent
    await seedInstapay({ ageHours: 72, paid: true }); // paid
    await seedInstapay({ ageHours: 72, status: 'confirmed' }); // already moved on
    await seedOrder('pending'); // COD
    const res = await request(app).get('/api/admin/orders/stale-unpaid').set('Cookie', ADMIN);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ count: 1, hours: 48 });
  });

  it('honours a custom window', async () => {
    await seedInstapay({ ageHours: 5 });
    expect((await request(app).get('/api/admin/orders/stale-unpaid?hours=2').set('Cookie', ADMIN)).body.count).toBe(1);
    expect((await request(app).get('/api/admin/orders/stale-unpaid?hours=12').set('Cookie', ADMIN)).body.count).toBe(0);
  });

  it('releasing cancels them and returns their stock', async () => {
    const { order, product } = await seedInstapay({ ageHours: 72 });
    const fresh = await seedInstapay({ ageHours: 1 });
    const res = await request(app).post('/api/admin/orders/release-stale').set('Cookie', ADMIN).send({ hours: 48 });
    expect(res.status).toBe(200);
    expect(res.body.cancelled).toBe(1);

    const cancelled = await Order.findById(order._id).lean();
    expect(cancelled!.status).toBe('cancelled');
    expect(cancelled!.statusHistory.at(-1)!.status).toBe('cancelled');
    expect((await Product.findById(product._id).lean())!.sizes[0]!.stock).toBe(3); // 1 + 2 restored

    // The recent one is untouched.
    expect((await Order.findById(fresh.order._id).lean())!.status).toBe('pending');
    expect((await Product.findById(fresh.product._id).lean())!.sizes[0]!.stock).toBe(1);
  });

  it('403s for a customer', async () => {
    expect((await request(app).get('/api/admin/orders/stale-unpaid').set('Cookie', CUSTOMER)).status).toBe(403);
    expect((await request(app).post('/api/admin/orders/release-stale').set('Cookie', CUSTOMER).send({ hours: 48 })).status).toBe(403);
  });
});
