import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Royal Oud')).toBe('royal-oud');
  });
  it('strips punctuation and collapses separators', () => {
    expect(slugify('  Amber & Musk!! ')).toBe('amber-musk');
  });
  it('removes leading/trailing hyphens', () => {
    expect(slugify('--Hello--')).toBe('hello');
  });
});
