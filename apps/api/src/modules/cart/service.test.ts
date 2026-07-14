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

  it('prices a sample line from settings and gates on sampleStock', async () => {
    const p = await Product.create({
      name: 'Amber Noir', slug: 'amber-noir', type: 'perfume', shortDesc: 's', description: 'd',
      images: ['img'], sizes: [{ label: '50ml', price: 1100, stock: 3 }], basePrice: 1100,
      gender: 'unisex', concentration: 'EDP', isActive: true, sampleStock: 2,
    });
    await Setting.findOneAndUpdate({}, { samples: { price: 75 } });
    const priced = await priceItems([{ productId: String(p._id), sizeLabel: 'sample', qty: 2 }]);
    expect(priced.items[0]!.unitPrice).toBe(75);
    expect(priced.items[0]!.available).toBe(true);
    expect(priced.items[0]!.maxQty).toBe(2);
    expect(priced.subtotal).toBe(150);

    const over = await priceItems([{ productId: String(p._id), sizeLabel: 'sample', qty: 3 }]);
    expect(over.items[0]!.available).toBe(false);
    expect(over.hasUnavailable).toBe(true);
  });

  it('sample lines are unavailable for non-perfumes and zero-sample products', async () => {
    const bundle = await Product.create({
      name: 'Duo', slug: 'duo', type: 'bundle', shortDesc: 's', description: 'd', images: ['img'],
      sizes: [{ label: 'Set', price: 1900, stock: 3 }], basePrice: 1900,
      gender: 'unisex', concentration: 'Other', isActive: true, sampleStock: 5,
      bundleItems: [],
    });
    const priced = await priceItems([{ productId: String(bundle._id), sizeLabel: 'sample', qty: 1 }]);
    expect(priced.items[0]!.available).toBe(false);
  });
});
