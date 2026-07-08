import { describe, it, expect, beforeEach } from 'vitest';
import { readHeroCache, writeHeroCache, type CachedHero } from './heroCache';

const hero: CachedHero = {
  title: 'Luxury in every drop',
  subtitle: 'sub',
  ctaText: 'Shop',
  ctaLink: '/products',
  image: 'herencia/hero',
  imageUrl: 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1600/herencia/hero',
};

describe('readHeroCache', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.__HERO__;
  });

  it('returns null with no cache and no baked hero', () => {
    expect(readHeroCache()).toBeNull();
  });

  it('falls back to the baked window.__HERO__ on a first-ever visit', () => {
    window.__HERO__ = hero;
    expect(readHeroCache()).toEqual(hero);
  });

  it('prefers the localStorage cache over the baked hero', () => {
    window.__HERO__ = hero;
    writeHeroCache({ ...hero, title: 'Fresher title' });
    expect(readHeroCache()?.title).toBe('Fresher title');
  });

  it('ignores a malformed baked hero', () => {
    window.__HERO__ = { nope: true } as unknown as CachedHero;
    expect(readHeroCache()).toBeNull();
  });
});
