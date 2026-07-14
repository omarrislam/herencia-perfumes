import { describe, it, expect } from 'vitest';
import { applySampleTokens } from './sampleCopy';

describe('applySampleTokens', () => {
  it('replaces {price} and {size} tokens (all occurrences)', () => {
    const out = applySampleTokens('Any scent · {size} vial · {price} each · {price}', { price: 60, sizeLabel: '5ml' });
    expect(out).toContain('5ml');
    expect(out).not.toContain('{price}');
    expect(out).not.toContain('{size}');
    expect(out.match(/60/g)!.length).toBe(2);
  });
});
