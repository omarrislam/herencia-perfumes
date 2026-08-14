import { Router } from 'express';
import { Product } from '../models/Product';
import { BlogPost } from '../models/BlogPost';
import { buildHeadTags, routeMetaForPath } from '../lib/seo';

// Every route worth giving its own <head>. Static routes mirror STATIC_META in lib/seo.
const STATIC_ROUTES = ['/', '/products', '/bundles', '/blog', '/about', '/contact'];

/**
 * One-shot feed of per-route <head> tags for the web build to bake into static HTML.
 *
 * On the split Vercel deployment the web project serves prebuilt HTML and never passes
 * through this server, so `mountSpa`'s request-time injection never runs and every page
 * ships the same generic title. The build script consumes this endpoint instead, which
 * keeps lib/seo.ts the single source of SEO truth rather than reimplementing it in the
 * build. Everything returned here is public metadata intended for the page source.
 */
export function seoRouter(origin: string): Router {
  const router = Router();

  router.get('/seo/prerender', async (_req, res, next) => {
    try {
      const [products, posts] = await Promise.all([
        Product.find({ isActive: true }).select('slug type').lean(),
        BlogPost.find({ isPublished: true }).select('slug').lean(),
      ]);

      const paths = [
        ...STATIC_ROUTES,
        ...products.map((p) => `/${p.type === 'bundle' ? 'bundles' : 'products'}/${p.slug}`),
        ...posts.map((p) => `/blog/${p.slug}`),
      ];

      const routes = await Promise.all(
        paths.map(async (path) => ({ path, head: buildHeadTags(await routeMetaForPath(path), origin) })),
      );

      res.json({ routes });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
