import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectMemory, disconnectMemory, clearDb } from '../../test/db';
import { ScentFamily } from '../../models/ScentFamily';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';
import { DiscountCode } from '../../models/DiscountCode';
import { Order } from '../../models/Order';
import { createOrder, linkGuestOrders } from './service';
import { Session } from '../../models/Session';
import { Event } from '../../models/Event';

beforeAll(connectMemory);
afterAll(disconnectMemory);

let productId: string;
beforeEach(async () => {
  await clearDb();
  await Setting.create({
    whatsappNumber: '201000000000', shippingFee: 50, freeShippingThreshold: 2000,
    hero: { title: 't', subtitle: 's', ctaText: 'c', ctaLink: '/', image: 'x' },
  });
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const p = await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['img1'],
    sizes: [{ label: '50ml', price: 800, stock: 3 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
});

const input = (qty: number) => ({
  items: [{ productId, sizeLabel: '50ml', qty }],
  customer: { name: 'Mai', phone: '01000000000' },
  shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
});

describe('createOrder', () => {
  it('creates a CONFIRMED COD order, snapshots items, decrements stock, returns a whatsapp url', async () => {
    const { order, whatsappUrl } = await createOrder(input(2));
    expect(order.status).toBe('confirmed'); // COD has no payment step
    expect(order.statusHistory[0]).toMatchObject({ status: 'confirmed' });
    expect(order.paymentMethod).toBe('cod');
    expect(order.subtotal).toBe(1600);
    expect(order.total).toBe(1650);
    expect(order.items[0]).toMatchObject({ name: 'Royal Oud', unitPrice: 800, qty: 2 });
    expect(order.orderNumber).toMatch(/^HRC-/);
    expect(whatsappUrl).toContain('wa.me');
    const after = await Product.findById(productId).lean();
    expect(after!.sizes[0]!.stock).toBe(1);
  });
  it('throws 409 when a line exceeds stock', async () => {
    await expect(createOrder(input(5))).rejects.toMatchObject({ status: 409 });
  });
  it('applies the email-popup discount for a valid code (case-insensitive), server-computed', async () => {
    await Setting.updateOne({}, { $set: { emailPopup: { enabled: true, code: 'WELCOME10', discountPercent: 10 } } });
    const { order } = await createOrder({ ...input(2), discountCode: 'welcome10' });
    expect(order.discount).toBe(160); // 10% of 1600
    expect(order.discountCode).toBe('WELCOME10');
    expect(order.total).toBe(1490); // 1600 + 50 shipping − 160
  });
  it('ignores an invalid or disabled discount code', async () => {
    await Setting.updateOne({}, { $set: { emailPopup: { enabled: false, code: 'WELCOME10', discountPercent: 10 } } });
    const { order } = await createOrder({ ...input(1), discountCode: 'WELCOME10' });
    expect(order.discount).toBe(0);
    expect(order.discountCode).toBeUndefined();
    expect(order.total).toBe(850);

    await Setting.updateOne({}, { $set: { 'emailPopup.enabled': true } });
    const { order: order2 } = await createOrder({ ...input(1), discountCode: 'WRONG' });
    expect(order2.discount).toBe(0);
    expect(order2.total).toBe(850);
  });
  it('applies an admin-managed discount code (case-insensitive) and increments uses', async () => {
    await DiscountCode.create({ code: 'SAVE20', percent: 20, isActive: true });
    const { order } = await createOrder({ ...input(2), discountCode: 'save20' });
    expect(order.discount).toBe(320); // 20% of 1600
    expect(order.discountCode).toBe('SAVE20');
    expect(order.total).toBe(1330); // 1600 + 50 − 320
    const dc = await DiscountCode.findOne({ code: 'SAVE20' }).lean();
    expect(dc!.uses).toBe(1);
  });

  it('ignores paused or expired admin codes', async () => {
    await DiscountCode.create({ code: 'PAUSED', percent: 20, isActive: false });
    await DiscountCode.create({ code: 'GONE', percent: 20, isActive: true, expiresAt: new Date(Date.now() - 1000) });
    const { order } = await createOrder({ ...input(1), discountCode: 'PAUSED' });
    expect(order.discount).toBe(0);
    const { order: order2 } = await createOrder({ ...input(1), discountCode: 'GONE' });
    expect(order2.discount).toBe(0);
  });

  it('InstaPay orders stay pending until payment is marked received', async () => {
    const { order } = await createOrder({ ...input(1), paymentMethod: 'instapay' });
    expect(order.status).toBe('pending');
  });

  it('409 cart_unavailable carries details.items listing the unavailable lines', async () => {
    let caught: unknown;
    try {
      await createOrder(input(5));
    } catch (e) {
      caught = e;
    }
    expect(caught).toMatchObject({ status: 409, code: 'cart_unavailable' });
    const details = (caught as { details?: { items?: unknown[] } }).details;
    expect(Array.isArray(details?.items)).toBe(true);
    expect((details?.items ?? []).length).toBeGreaterThan(0);
  });

  it('creates an order with a sample line: decrements sampleStock, snapshots label', async () => {
    const fam = await ScentFamily.create({ name: 'Citrus', slug: 'citrus', order: 2 });
    const p = await Product.create({
      name: 'Amber Noir', type: 'perfume', shortDesc: 's', description: 'd', images: ['img1'],
      sizes: [{ label: '50ml', price: 800, stock: 3 }], scentFamily: fam._id,
      notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
      sampleStock: 3,
    });
    const result = await createOrder({
      ...input(2),
      items: [{ productId: String(p._id), sizeLabel: 'sample', qty: 2 }],
    });
    expect(result.order.items[0]!.sizeLabel).toBe('Sample · 5ml');
    expect(result.order.items[0]!.isSample).toBe(true);
    const fresh = await Product.findById(p._id).lean();
    expect(fresh!.sampleStock).toBe(1);
  });

  it('rejects a sample order beyond sampleStock and rolls back nothing', async () => {
    const fam = await ScentFamily.create({ name: 'Citrus', slug: 'citrus', order: 2 });
    const p = await Product.create({
      name: 'Amber Noir', type: 'perfume', shortDesc: 's', description: 'd', images: ['img1'],
      sizes: [{ label: '50ml', price: 800, stock: 3 }], scentFamily: fam._id,
      notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
      sampleStock: 1,
    });
    await expect(
      createOrder({ ...input(2), items: [{ productId: String(p._id), sizeLabel: 'sample', qty: 2 }] }),
    ).rejects.toMatchObject({ status: 409 });
    const fresh = await Product.findById(p._id).lean();
    expect(fresh!.sampleStock).toBe(1);
  });
});

describe('discount eligibility (one per phone number)', () => {
  const otherPhone = (base: ReturnType<typeof input>, phone: string) => ({
    ...base,
    customer: { ...base.customer, phone },
    shippingAddress: { ...base.shippingAddress, phone },
  });

  it('rejects the welcome code on a phone number that has ordered before', async () => {
    await Setting.updateOne({}, { $set: { emailPopup: { enabled: true, code: 'WELCOME10', discountPercent: 10 } } });
    const first = await createOrder({ ...input(1), discountCode: 'WELCOME10' });
    expect(first.order.discount).toBe(80);

    await expect(createOrder({ ...input(1), discountCode: 'WELCOME10' })).rejects.toMatchObject({
      status: 409,
      code: 'discount_not_eligible',
    });
  });

  it('still honours the welcome code for a different phone number', async () => {
    await Setting.updateOne({}, { $set: { emailPopup: { enabled: true, code: 'WELCOME10', discountPercent: 10 } } });
    await createOrder({ ...input(1), discountCode: 'WELCOME10' });
    const { order } = await createOrder({
      ...otherPhone(input(1), '01111111111'),
      discountCode: 'WELCOME10',
    });
    expect(order.discount).toBe(80);
  });

  it('a cancelled first order does not burn the welcome code', async () => {
    await Setting.updateOne({}, { $set: { emailPopup: { enabled: true, code: 'WELCOME10', discountPercent: 10 } } });
    const first = await createOrder(input(1));
    await Order.updateOne({ _id: first.order.id }, { $set: { status: 'cancelled' } });
    const { order } = await createOrder({ ...input(1), discountCode: 'WELCOME10' });
    expect(order.discount).toBe(80);
  });

  it('rejects reuse of an admin code by the same phone but allows another', async () => {
    await DiscountCode.create({ code: 'SAVE20', percent: 20, isActive: true });
    await createOrder({ ...input(1), discountCode: 'SAVE20' });
    await expect(createOrder({ ...input(1), discountCode: 'SAVE20' })).rejects.toMatchObject({
      status: 409,
      code: 'discount_not_eligible',
    });
    const { order } = await createOrder({
      ...otherPhone(input(1), '01111111111'),
      discountCode: 'SAVE20',
    });
    expect(order.discount).toBe(160);
  });

  it('a rejected code leaves stock untouched (checked before any decrement)', async () => {
    await DiscountCode.create({ code: 'SAVE20', percent: 20, isActive: true });
    await createOrder({ ...input(1), discountCode: 'SAVE20' });
    const before = (await Product.findById(productId).lean())!.sizes[0]!.stock;
    await expect(createOrder({ ...input(1), discountCode: 'SAVE20' })).rejects.toMatchObject({ status: 409 });
    const after = (await Product.findById(productId).lean())!.sizes[0]!.stock;
    expect(after).toBe(before);
  });

  it('does not count a code use until the order is actually created', async () => {
    await DiscountCode.create({ code: 'SAVE20', percent: 20, isActive: true });
    // qty 5 exceeds stock 3 → the order never exists, so `uses` must stay 0.
    await expect(createOrder({ ...input(5), discountCode: 'SAVE20' })).rejects.toMatchObject({ status: 409 });
    const dc = await DiscountCode.findOne({ code: 'SAVE20' }).lean();
    expect(dc!.uses).toBe(0);
  });
});

describe('linkGuestOrders', () => {
  const userId = '000000000000000000000042';

  it('adopts guest orders matching the phone, normalizing +20 form', async () => {
    await createOrder(input(1));
    const linked = await linkGuestOrders(userId, { phone: '+201000000000' });
    expect(linked).toBe(1);
    const order = await Order.findOne({}).lean();
    expect(String(order!.user)).toBe(userId);
  });

  it('adopts guest orders matching the email case-insensitively', async () => {
    await createOrder({
      ...input(1),
      customer: { name: 'Mai', phone: '01000000000', email: 'Mai@Example.com' },
    });
    expect(await linkGuestOrders(userId, { email: 'mai@example.com' })).toBe(1);
  });

  it('never reassigns an order that already belongs to someone', async () => {
    await createOrder(input(1), '000000000000000000000099');
    expect(await linkGuestOrders(userId, { phone: '01000000000' })).toBe(0);
  });

  it('matches nothing without a usable email or phone', async () => {
    await createOrder(input(1));
    expect(await linkGuestOrders(userId, { phone: 'not-a-phone' })).toBe(0);
    expect(await linkGuestOrders(userId, {})).toBe(0);
  });
});

describe('createOrder — analytics attribution', () => {
  it('stamps the session campaign onto the order permanently', async () => {
    await Session.create({
      sessionId: 'S1', visitorId: 'V1', landingPath: '/products/royal-oud',
      referrer: 'https://instagram.com/',
      utm: { source: 'instagram', medium: 'social', campaign: 'launch' },
    });
    const { order } = await createOrder({ ...input(1), sessionId: 'S1', visitorId: 'V1' });
    const doc = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(doc!.attribution).toMatchObject({
      source: 'instagram', medium: 'social', campaign: 'launch',
      landingPath: '/products/royal-oud', sessionId: 'S1',
    });
  });

  it('writes exactly one purchase event carrying the real order total', async () => {
    await Session.create({ sessionId: 'S1', visitorId: 'V1', landingPath: '/' });
    const { order } = await createOrder({ ...input(1), sessionId: 'S1', visitorId: 'V1' });
    const events = await Event.find({ type: 'purchase' }).lean();
    expect(events).toHaveLength(1);
    expect(events[0]!.orderNumber).toBe(order.orderNumber);
    expect(events[0]!.value).toBe(order.total);
  });

  it('still creates the order when no session is supplied', async () => {
    const { order } = await createOrder(input(1));
    expect(order.orderNumber).toBeTruthy();
    const doc = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(doc!.attribution?.source).toBeUndefined();
    expect(await Event.countDocuments({ type: 'purchase' })).toBe(0);
  });

  it('still creates the order when the sessionId is unknown', async () => {
    const { order } = await createOrder({ ...input(1), sessionId: 'GHOST', visitorId: 'V9' });
    expect(order.orderNumber).toBeTruthy();
    const doc = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(doc!.attribution?.source).toBeUndefined();
  });
});
