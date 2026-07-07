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
};

const KEY = 'herencia.hero';

export function readHeroCache(): CachedHero | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const h = JSON.parse(raw) as CachedHero;
    return typeof h?.title === 'string' && typeof h?.image === 'string' ? h : null;
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
