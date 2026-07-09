// Bakes the current hero (content + resolved image URL) into dist/index.html so a
// FIRST-EVER visitor discovers the hero image in the initial HTML (like SSR/Shopify)
// instead of waiting for JS + /api/settings. Runtime settings still win: the app
// replaces the baked hero once fresh settings load (same image → no swap), so a
// stale bake only matters until the next deploy after a hero change in Admin.
//
// Fails soft: any error (API down, offline local build) leaves the plain build intact.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Vercel provides env vars directly; local builds keep the cloud name in the
// gitignored apps/web/.env (vite reads it, plain node does not) — fall back to it.
function envVar(name) {
  if (process.env[name]) return process.env[name];
  const envPath = fileURLToPath(new URL('../.env', import.meta.url));
  if (!existsSync(envPath)) return '';
  const line = readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : '';
}

const SETTINGS_URL = process.env.SETTINGS_URL ?? 'https://herencia-api-pi.vercel.app/api/settings';
const CLOUD = envVar('VITE_CLOUDINARY_CLOUD_NAME');
const HTML_PATH = fileURLToPath(new URL('../dist/index.html', import.meta.url));

// Mirror of apps/web/src/lib/cloudinary.ts cld(id, { w: 1600 }) — the preload href
// must be byte-identical to the URL the app renders or the preload is wasted.
function heroUrl(image) {
  if (!image) return undefined;
  if (/^https?:\/\//.test(image) || image.startsWith('/') || !CLOUD) return undefined;
  return `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,w_1600/${image}`;
}

// Mirror of cldBlur() — the tiny blur-up preview the hero shows while the
// sharp image downloads. ~1–2 kB, so preloading it makes the blurred hero
// paint the moment React mounts.
function heroBlurUrl(image) {
  if (!image) return undefined;
  if (/^https?:\/\//.test(image) || image.startsWith('/') || !CLOUD) return undefined;
  return `https://res.cloudinary.com/${CLOUD}/image/upload/w_64,e_blur:100,q_auto,f_auto/${image}`;
}

try {
  const res = await fetch(SETTINGS_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`settings fetch ${res.status}`);
  const { hero } = await res.json();
  if (!hero?.title || !hero?.image) throw new Error('settings have no hero');

  const imageUrl = heroUrl(hero.image);
  const baked = {
    title: hero.title,
    subtitle: hero.subtitle,
    ctaText: hero.ctaText,
    ctaLink: hero.ctaLink,
    image: hero.image,
    ...(imageUrl ? { imageUrl } : {}),
  };

  const blurUrl = heroBlurUrl(hero.image);
  const inject = [
    imageUrl ? `<link rel="preload" as="image" href="${imageUrl}" fetchpriority="high" />` : '',
    blurUrl ? `<link rel="preload" as="image" href="${blurUrl}" fetchpriority="high" />` : '',
    // </script> can't appear inside JSON string values after JSON.stringify escaping
    // of user content is applied below, but guard the sequence anyway.
    `<script>window.__HERO__=${JSON.stringify(baked).replace(/</g, '\\u003c')}</script>`,
  ].filter(Boolean).join('\n    ');

  const html = await readFile(HTML_PATH, 'utf8');
  if (html.includes('window.__HERO__')) throw new Error('hero already baked');
  await writeFile(HTML_PATH, html.replace('</head>', `  ${inject}\n  </head>`), 'utf8');
  console.log(`[bake-hero] baked "${baked.title}" ${imageUrl ?? '(no cloud image)'}`);
} catch (err) {
  console.warn(`[bake-hero] skipped: ${err instanceof Error ? err.message : err}`);
}
