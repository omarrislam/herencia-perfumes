import { Router } from 'express';
import { createReviewSchema } from '@herencia/shared';
import { Product } from '../models/Product';
import { Review } from '../models/Review';
import { HttpError } from '../middleware/error';
import { authenticate, requireAuth } from '../middleware/auth';
import { toReviewDTO } from '../lib/serialize';
import { reviewLimiter } from '../middleware/rateLimit';

export function reviewRouter(): Router {
  const router = Router();

  router.get('/products/:slug/reviews', async (req, res, next) => {
    try {
      const product = await Product.findOne({ slug: req.params['slug'], isActive: true }).select('_id').lean();
      if (!product) throw new HttpError(404, 'Product not found', 'not_found');
      const page = Math.max(1, Number(req.query['page'] ?? 1) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 10) || 10));
      const filter = { product: product._id, isApproved: true };
      const [docs, total] = await Promise.all([
        Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name').lean(),
        Review.countDocuments(filter),
      ]);
      res.json({ items: docs.map(toReviewDTO), total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
      next(err);
    }
  });

  router.post('/products/:slug/reviews', reviewLimiter, authenticate, requireAuth, async (req, res, next) => {
    try {
      const parsed = createReviewSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const product = await Product.findOne({ slug: req.params['slug'], isActive: true }).select('_id').lean();
      if (!product) throw new HttpError(404, 'Product not found', 'not_found');
      if (await Review.exists({ product: product._id, user: req.user!.id })) {
        throw new HttpError(409, 'You have already reviewed this product', 'conflict');
      }
      const doc = await Review.create({ ...parsed.data, product: product._id, user: req.user!.id, isApproved: false });
      const populated = await doc.populate('user', 'name');
      res.status(201).json(toReviewDTO(populated.toObject()));
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        return next(new HttpError(409, 'You have already reviewed this product', 'conflict'));
      }
      next(err);
    }
  });

  return router;
}
