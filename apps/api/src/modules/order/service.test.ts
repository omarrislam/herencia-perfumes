import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectMemory, disconnectMemory, clearDb } from '../../test/db';
import { ScentFamily } from '../../models/ScentFamily';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';
import { DiscountCode } from '../../models/DiscountCode';
import { createOrder } from './service';

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
});
