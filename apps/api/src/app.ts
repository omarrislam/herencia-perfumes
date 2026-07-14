import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler, notFound } from './middleware/error';
import { authRouter } from './routes/auth';
import { catalogRouter } from './routes/catalog';
import { settingsRouter } from './routes/settings';
import { adminRouter } from './routes/admin';
import { cartRouter } from './routes/cart';
import { orderRouter } from './routes/orders';
import { accountRouter } from './routes/account';
import { reviewRouter } from './routes/reviews';
import { quizRouter } from './routes/quiz';
import { bannerRouter } from './routes/banners';
import { blogRouter } from './routes/blog';
import { newsletterRouter } from './routes/newsletter';
import { noteIconRouter } from './routes/noteIcons';
import { discountRouter } from './routes/discounts';
import { buildSitemap, ROBOTS_TXT } from './lib/seo';
import { mountSpa } from './middleware/spa';
import { Product } from './models/Product';
import { BlogPost } from './models/BlogPost';

export function createApp(opts: {
  clientOrigin: string;
  webDist?: string;
  origin?: string;
}): Express {
  const app = express();
  // Behind a reverse proxy (nginx) in production, trust the first proxy hop so
  // express-rate-limit keys on the real client IP (X-Forwarded-For), not the
  // proxy socket. Left off in dev/test to avoid trusting spoofable headers.
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          // res.cloudinary.com = real (admin-uploaded) images. picsum.photos +
          // fastly.picsum.photos are the demo seed placeholders — remove them once
          // the catalog is reseeded with real Cloudinary assets.
          imgSrc: [
            "'self'",
            'data:',
            'https://res.cloudinary.com',
            'https://picsum.photos',
            'https://fastly.picsum.photos',
          ],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  );
  // Comma-separated list supported so the old .vercel.app domain keeps working
  // alongside the custom domain during (and after) the switch.
  app.use(cors({ origin: opts.clientOrigin.split(',').map((o) => o.trim()), credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter());
  app.use('/api', catalogRouter);
  app.use('/api', settingsRouter);
  app.use('/api/admin', adminRouter());
  app.use('/api/cart', cartRouter());
  app.use('/api/orders', orderRouter());
  app.use('/api/account', accountRouter());
  app.use('/api', reviewRouter());
  app.use('/api', quizRouter());
  app.use('/api', bannerRouter());
  app.use('/api', blogRouter());
  app.use('/api', newsletterRouter());
  app.use('/api', noteIconRouter);
  app.use('/api/discounts', discountRouter());
  app.use('/api', notFound);

  const origin = opts.origin ?? '';
  app.get('/robots.txt', (_req, res) =>
    res.type('text/plain').send(ROBOTS_TXT.replace('/sitemap.xml', `${origin}/sitemap.xml`)),
  );
  app.get('/sitemap.xml', async (_req, res, next) => {
    try {
      const [products, posts] = await Promise.all([
        Product.find({ isActive: true }).select('slug type').lean(),
        BlogPost.find({ isPublished: true }).select('slug').lean(),
      ]);
      res
        .type('application/xml')
        .send(buildSitemap(origin, products.map((p) => ({ slug: p.slug, type: p.type })), posts.map((p) => p.slug)));
    } catch (err) {
      next(err);
    }
  });

  if (opts.webDist) mountSpa(app, { webDist: opts.webDist, origin });

  app.use(errorHandler);
  return app;
}
