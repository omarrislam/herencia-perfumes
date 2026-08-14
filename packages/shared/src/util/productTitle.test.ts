import { describe, it, expect } from 'vitest';
import { productTitle, soleSizeLabel } from './productTitle';

describe('soleSizeLabel', () => {
  it('returns the label when there is exactly one size', () => {
    expect(soleSizeLabel({ sizes: [{ label: '55ml' }] })).toBe('55ml');
  });
  it('returns undefined when there are several sizes', () => {
    expect(soleSizeLabel({ sizes: [{ label: '55ml' }, { label: '100ml' }] })).toBeUndefined();
  });
  it('returns undefined when there are no sizes', () => {
    expect(soleSizeLabel({ sizes: [] })).toBeUndefined();
  });
});

describe('productTitle', () => {
  it('includes size and concentration for a single-size product', () => {
    expect(productTitle({ name: 'Ashes', sizes: [{ label: '55ml' }], concentration: 'EDP' })).toBe(
      'Ashes — 55ml EDP — HERENCIA',
    );
  });
  it('drops the size when a product has several', () => {
    expect(
      productTitle({ name: 'Ashes', sizes: [{ label: '55ml' }, { label: '100ml' }], concentration: 'EDP' }),
    ).toBe('Ashes — EDP — HERENCIA');
  });
  it('omits a placeholder "Other" concentration', () => {
    expect(productTitle({ name: 'Woody Duo', sizes: [{ label: '55ml' }], concentration: 'Other' })).toBe(
      'Woody Duo — 55ml — HERENCIA',
    );
  });
  it('falls back to just the name and brand when nothing qualifies it', () => {
    expect(productTitle({ name: 'Woody Duo', sizes: [], concentration: 'Other' })).toBe('Woody Duo — HERENCIA');
  });
});
