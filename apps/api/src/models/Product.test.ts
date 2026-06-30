import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { ScentFamily } from './ScentFamily';
import { Product } from './Product';

beforeAll(connectMemory);
afterAll(disconnectMemory);
afterEach(clearDb);

async function makeFamily() {
  return ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
}

describe('Product model', () => {
  it('derives slug from name and basePrice from min size price', async () => {
    const fam = await makeFamily();
    const p = await Product.create({
      name: 'Royal Oud',
      type: 'perfume',
      shortDesc: 'Regal',
      description: 'Long',
      images: ['herencia/royal-oud'],
      sizes: [
        { label: '100ml', price: 1800, stock: 3 },
        { label: '50ml', price: 1200, stock: 5 },
      ],
      scentFamily: fam._id,
      notes: { top: ['bergamot'], heart: ['rose'], base: ['oud'] },
      gender: 'unisex',
      concentration: 'EDP',
    });
    expect(p.slug).toBe('royal-oud');
    expect(p.basePrice).toBe(1200);
  });

  it('enforces unique slug', async () => {
    const fam = await makeFamily();
    const data = {
      name: 'Amber',
      type: 'perfume' as const,
      shortDesc: 's',
      description: 'd',
      images: ['x'],
      sizes: [{ label: '50ml', price: 900, stock: 1 }],
      scentFamily: fam._id,
      notes: { top: [], heart: [], base: [] },
      gender: 'women' as const,
      concentration: 'EDT' as const,
    };
    await Product.create(data);
    await expect(Product.create(data)).rejects.toBeTruthy();
  });
});
