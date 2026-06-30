import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import express, { type Express } from 'express';
import { buildHeadTags, routeMetaForPath } from '../lib/seo';

// Mounts static asset serving + an HTML fallback that injects per-route <head>.
export function mountSpa(app: Express, opts: { webDist: string; origin: string }) {
  // Static assets (hashed files) served directly; index disabled so the fallback runs.
  app.use(express.static(opts.webDist, { index: false }));

  const template = readFileSync(join(opts.webDist, 'index.html'), 'utf8');

  app.get('*', async (req, res, next) => {
    try {
      if (req.path.startsWith('/api')) return next();
      const meta = await routeMetaForPath(req.path);
      const head = buildHeadTags(meta, opts.origin);
      // Replace the template <title> (and everything we manage) by inserting before </head>.
      const withoutTitle = template.replace(/<title>.*?<\/title>/s, '');
      const html = withoutTitle.replace('</head>', `    ${head}\n  </head>`);
      res.status(200).type('html').send(html);
    } catch (err) {
      next(err);
    }
  });
}
