import { describe, it, expect } from 'vitest';
import { bannerSchema, BANNER_PLACEMENT } from './banner';

describe('banner schema', () => {
  it('accepts a valid banner', () => {
    expect(bannerSchema.safeParse({ title: 'Sale', image: 'banners/sale', placement: 'home_hero' }).success).toBe(true);
  });
  it('rejects an unknown placement', () => {
    expect(bannerSchema.safeParse({ title: 'Sale', image: 'x', placement: 'sidebar' }).success).toBe(false);
  });
  it('exposes the placement list', () => {
    expect(BANNER_PLACEMENT).toContain('global_top');
  });
});
