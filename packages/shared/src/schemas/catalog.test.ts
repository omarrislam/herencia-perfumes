import { describe, it, expect } from 'vitest';
import { adminProductSchema, productQuerySchema, scentFamilySchema } from './catalog';

describe('scentFamilySchema', () => {
  it('accepts a valid family', () => {
    expect(scentFamilySchema.parse({ name: 'Woody', order: 1 })).toMatchObject({ name: 'Woody', order: 1 });
  });
  it('defaults order to 0', () => {
    expect(scentFamilySchema.parse({ name: 'Floral' }).order).toBe(0);
  });
});

describe('adminProductSchema', () => {
  const base = {
    name: 'Royal Oud',
    type: 'perfume' as const,
    shortDesc: 'A regal oud.',
    description: 'Long description.',
    images: ['herencia/royal-oud'],
    sizes: [{ label: '50ml', price: 1200, stock: 5 }],
    scentFamily: 'a'.repeat(24),
    notes: { top: ['bergamot'], heart: ['rose'], base: ['oud'] },
    gender: 'unisex' as const,
    concentration: 'EDP' as const,
  };
  it('accepts a valid perfume', () => {
    expect(adminProductSchema.parse(base).name).toBe('Royal Oud');
  });
  it('rejects a product with no sizes', () => {
    expect(() => adminProductSchema.parse({ ...base, sizes: [] })).toThrow();
  });
  it('rejects negative price', () => {
    expect(() => adminProductSchema.parse({ ...base, sizes: [{ label: '50ml', price: -1, stock: 0 }] })).toThrow();
  });
  it('rejects a price with more than 2 decimals', () => {
    expect(() => adminProductSchema.parse({ ...base, sizes: [{ label: '50ml', price: 1.001, stock: 1 }] })).toThrow();
  });
  it('allows a sample product without a scent family (empty string or absent)', () => {
    // The seeded "Perfume Sample" has no scent family; the admin form sends ''.
    const sample = { ...base, type: 'sample' as const, scentFamily: '' };
    expect(adminProductSchema.parse(sample).scentFamily).toBeUndefined();
    const noFamily: Record<string, unknown> = { ...sample };
    delete noFamily['scentFamily'];
    expect(adminProductSchema.parse(noFamily).scentFamily).toBeUndefined();
  });
  it('still requires a scent family for perfumes and bundles', () => {
    expect(() => adminProductSchema.parse({ ...base, scentFamily: '' })).toThrow();
    expect(() =>
      adminProductSchema.parse({
        ...base,
        type: 'bundle',
        scentFamily: '',
        bundleItems: [{ product: 'b'.repeat(24), qty: 1 }],
      }),
    ).toThrow();
  });
  it('requires bundleItems when type is bundle', () => {
    expect(() => adminProductSchema.parse({ ...base, type: 'bundle' })).toThrow();
    const bundle = adminProductSchema.parse({
      ...base,
      type: 'bundle',
      bundleItems: [{ product: 'b'.repeat(24), qty: 2 }],
    });
    expect(bundle.bundleItems?.[0]?.qty).toBe(2);
  });
});

describe('productQuerySchema', () => {
  it('coerces and defaults paging/sort', () => {
    const q = productQuerySchema.parse({ page: '2', minPrice: '100' });
    expect(q.page).toBe(2);
    expect(q.limit).toBe(12);
    expect(q.sort).toBe('newest');
    expect(q.minPrice).toBe(100);
  });
  it('rejects an unknown sort', () => {
    expect(() => productQuerySchema.parse({ sort: 'banana' })).toThrow();
  });
});
