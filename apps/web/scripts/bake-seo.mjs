// Bakes per-route <head> (title, description, OG, canonical, JSON-LD) into static HTML
// so search engines see real per-page metadata.
//
// Why this exists: the API's mountSpa injects this at request time, but on the split
// Vercel deployment the web project serves prebuilt HTML and requests never reach the
// API server — so every page shipped the same generic <title>. This asks the API for
// the tags it would have injected and writes them into dist/<route>/index.html.
// lib/seo.ts stays the single source of SEO truth; nothing is reimplemented here.
//
// Vercel checks the filesystem before applying vercel.json rewrites, so these files
// win over the SPA catch-all automatically — no routing config change needed.
//
// Caveat (same as bake-hero): adding a product or post needs a web redeploy before its
// metadata goes live. Un-baked routes still work, they just fall back to generic meta.
//
// Fails soft: any error (API down, offline local build) leaves the plain build intact.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = process.env.SEO_API_URL ?? 'https://herencia-api-pi.vercel.app';
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

// The prerender step (decision #34) writes a populated #root for some routes so the
// client can hydrate; those must keep their own HTML. Everything else starts from the
// empty-#root shell so React calls createRoot instead of hydrating stale markup.
//
// The fallback is read ONCE, before any writes: a web-only build has no spa-shell.html,
// so the fallback resolves to index.html — and index.html is itself a route we rewrite.
// Re-reading it per route makes every later page inherit the home page's canonical and
// OG tags. (mountSpa reads its fallbackShell once at mount for the same reason.)
async function loadFallback() {
  return readFile(join(DIST, 'spa-shell.html'), 'utf8').catch(() =>
    readFile(join(DIST, 'index.html'), 'utf8'),
  );
}

async function templateFor(path, fallback) {
  const candidate = path === '/' ? 'index.html' : join(path.replace(/^\//, ''), 'index.html');
  const html = await readFile(join(DIST, candidate), 'utf8').catch(() => fallback);
  return { html, out: candidate };
}

function injectHead(html, head) {
  // Drop the build's placeholder <title> so we don't emit two.
  const stripped = html.replace(/<title>.*?<\/title>/s, '');
  if (!stripped.includes('</head>')) throw new Error('template has no </head>');
  return stripped.replace('</head>', `    ${head}\n  </head>`);
}

try {
  const res = await fetch(`${API}/api/seo/prerender`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`prerender fetch ${res.status}`);
  const { routes } = await res.json();
  if (!Array.isArray(routes) || routes.length === 0) throw new Error('no routes returned');

  const fallback = await loadFallback();

  let written = 0;
  for (const { path, head } of routes) {
    // Path traversal guard: these come from the API, but they end up as filesystem writes.
    if (!path.startsWith('/') || path.includes('..')) {
      console.warn(`[bake-seo] skipped suspicious path: ${path}`);
      continue;
    }
    const { html, out } = await templateFor(path, fallback);
    const target = join(DIST, out);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, injectHead(html, head), 'utf8');
    written += 1;
  }

  // robots.txt only resolved on the API domain before; crawlers look for it on the site
  // domain. Its content only changes with the origin, so baking it stays correct.
  //
  // sitemap.xml is deliberately NOT baked: a baked copy goes stale the moment a product
  // is added, renamed, or deactivated, and Vercel serves the filesystem before applying
  // rewrites — so a stale file here would shadow the live proxy. vercel.json rewrites
  // /sitemap.xml to the API instead, which builds it from the database per request.
  const r = await fetch(`${API}/robots.txt`, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`robots.txt fetch ${r.status}`);
  await writeFile(join(DIST, 'robots.txt'), await r.text(), 'utf8');

  console.log(`[bake-seo] baked ${written} routes + robots.txt (sitemap.xml is proxied live)`);
} catch (err) {
  console.warn(`[bake-seo] skipped: ${err instanceof Error ? err.message : err}`);
}
