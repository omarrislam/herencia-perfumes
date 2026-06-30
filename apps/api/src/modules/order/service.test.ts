import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectMemory, disconnectMemory, clearDb } from '../../test/db';
import { ScentFamily } from '../../models/ScentFamily';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';
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
  customer: { name: 'Mai', phone: '0100000000' },
  shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '0100000000' },
});

describe('createOrder', () => {
  it('creates a pending COD order, snapshots items, decrements stock, returns a whatsapp url', async () => {
    const { order, whatsappUrl } = await createOrder(input(2));
    expect(order.status).toBe('pending');
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
});
