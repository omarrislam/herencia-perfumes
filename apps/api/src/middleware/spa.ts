import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import express, { type Express } from 'express';
import { buildHeadTags, routeMetaForPath } from '../lib/seo';

// Mounts static asset serving + an HTML fallback that injects per-route <head>.
// For prerendered routes (populated #root) we serve the matching dist/<route>/index.html
// so the client can hydrateRoot without mismatch. For everything else we serve the
// empty-#root spa-shell.html so the client calls createRoot (no stale home markup).
export function mountSpa(app: Express, opts: { webDist: string; origin: string }) {
  // Static assets (hashed files) served directly; index disabled so the fallback runs.
  app.use(express.static(opts.webDist, { index: false }));

  const root = resolve(opts.webDist);
  const shellPath = join(root, 'spa-shell.html');
  // Empty-#root fallback → client createRoot (no hydration mismatch on non-prerendered routes).
  const fallbackShell = readFileSync(existsSync(shellPath) ? shellPath : join(root, 'index.html'), 'utf8');
  const cache = new Map<string, string>();

  const templateFor = (pathname: string): string => {
    const rel =
      pathname === '/'
        ? 'index.html'
        : `${pathname.replace(/^\/+/, '').replace(/\/+$/, '')}/index.html`;
    const cached = cache.get(rel);
    if (cached !== undefined) return cached;
    const file = resolve(root, rel);
    // Guard against path traversal: resolved path must stay within webDist.
    if ((file === root || file.startsWith(root + sep)) && existsSync(file)) {
      const html = readFileSync(file, 'utf8');
      cache.set(rel, html);
      return html;
    }
    return fallbackShell; // not cached — bounds the map to real prerendered files
  };

  app.get('*', async (req, res, next) => {
    try {
      if (req.path.startsWith('/api')) return next();
      const template = templateFor(req.path);
      const meta = await routeMetaForPath(req.path);
      const head = buildHeadTags(meta, opts.origin);
      // Replace the template <title> (and everything we manage) by inserting before </head>.
      const withoutTitle = template.replace(/<title>.*?<\/title>/s, '');
      if (!withoutTitle.includes('</head>')) {
        console.error('[mountSpa] index.html has no </head> — head injection skipped');
      }
      const html = withoutTitle.replace('</head>', `    ${head}\n  </head>`);
      res.status(200).type('html').send(html);
    } catch (err) {
      next(err);
    }
  });
}
