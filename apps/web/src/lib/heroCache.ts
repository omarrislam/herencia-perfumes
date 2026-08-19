// Last-known hero, cached so returning visitors see the correct hero instantly
// instead of waiting for /api/settings. Refreshed on every successful settings load.
export type CachedHero = {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  image: string;
  // Fully-resolved image URL (Cloudinary), used for the pre-React preload.
  imageUrl?: string;
  // Optional looping background video layered over the image once it can play.
  video?: string;
};

const KEY = 'herencia.hero';

declare global {
  interface Window {
    // Hero baked into index.html at build time (scripts/bake-hero.mjs) so a
    // first-ever visit renders it without waiting for /api/settings.
    __HERO__?: CachedHero;
  }
}

const isHero = (h: unknown): h is CachedHero =>
  typeof (h as CachedHero)?.title === 'string' && typeof (h as CachedHero)?.image === 'string';

export function readHeroCache(): CachedHero | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const h = JSON.parse(raw) as unknown;
      if (isHero(h)) return h;
    }
    // First-ever visit: fall back to the build-time baked hero.
    return isHero(window.__HERO__) ? window.__HERO__ : null;
  } catch {
    return null;
  }
}

export function writeHeroCache(hero: CachedHero): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(hero));
  } catch {
    /* private mode */
  }
}

// Kick off the hero image download before React mounts (called from main.tsx).
export function preloadCachedHero(): void {
  const h = readHeroCache();
  if (!h?.imageUrl) return;
  if (document.querySelector(`link[rel="preload"][href="${CSS.escape(h.imageUrl)}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = h.imageUrl;
  document.head.appendChild(link);
}
