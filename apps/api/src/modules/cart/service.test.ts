import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectMemory, disconnectMemory, clearDb } from '../../test/db';
import { ScentFamily } from '../../models/ScentFamily';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';
import { priceItems } from './service';

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

describe('priceItems', () => {
  it('recomputes line totals from the DB and adds shipping', async () => {
    const cart = await priceItems([{ productId, sizeLabel: '50ml', qty: 2 }]);
    expect(cart.subtotal).toBe(1600);
    expect(cart.shipping).toBe(50);
    expect(cart.total).toBe(1650);
    expect(cart.items[0]).toMatchObject({ unitPrice: 800, lineTotal: 1600, available: true, maxQty: 3 });
  });
  it('applies free shipping over the threshold', async () => {
    const cart = await priceItems([{ productId, sizeLabel: '50ml', qty: 3 }]); // 2400 ≥ 2000
    expect(cart.shipping).toBe(0);
    expect(cart.total).toBe(2400);
  });
  it('flags an out-of-stock / over-qty line as unavailable and excludes it from subtotal', async () => {
    const cart = await priceItems([{ productId, sizeLabel: '50ml', qty: 5 }]); // stock 3
    expect(cart.items[0]!.available).toBe(false);
    expect(cart.hasUnavailable).toBe(true);
    expect(cart.subtotal).toBe(0);
  });
  it('marks a missing product/size unavailable', async () => {
    const cart = await priceItems([{ productId, sizeLabel: '999ml', qty: 1 }]);
    expect(cart.items[0]).toMatchObject({ available: false, unitPrice: 0, maxQty: 0 });
  });
});
