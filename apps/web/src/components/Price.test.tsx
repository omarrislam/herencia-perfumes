import { describe, it, expect } from 'vitest';
import { formatEGP } from './Price';

describe('formatEGP', () => {
  it('formats whole numbers with EGP and no decimals', () => {
    expect(formatEGP(1200)).toBe('EGP 1,200');
  });
  it('keeps two decimals when present', () => {
    expect(formatEGP(1200.5)).toBe('EGP 1,200.50');
  });
});
