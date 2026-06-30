import { describe, it, expect } from 'vitest';
import { parseFiltersFromParams } from './useProductFilters';

describe('parseFiltersFromParams', () => {
  it('reads known filter keys and coerces numbers', () => {
    const f = parseFiltersFromParams(new URLSearchParams('gender=women&minPrice=100&page=2&sort=price-asc'));
    expect(f).toMatchObject({ gender: 'women', minPrice: 100, page: 2, sort: 'price-asc' });
  });
  it('ignores empty values', () => {
    const f = parseFiltersFromParams(new URLSearchParams('q=&gender='));
    expect(f.q).toBeUndefined();
    expect(f.gender).toBeUndefined();
  });
});
