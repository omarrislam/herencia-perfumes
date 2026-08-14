import { Router } from 'express';
import { verifiedReviewSchema, createReviewSchema } from '@herencia/shared';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { HttpError } from '../middleware/error';
import { authenticate, requireAuth } from '../middleware/auth';
import { toReviewDTO } from '../lib/serialize';
import { reviewLimiter } from '../middleware/rateLimit';

export function reviewRouter(): Router {
  const router = Router();

  // Recent approved, high-rated reviews across all products — powers the homepage testimonials carousel.
  router.get('/reviews/highlights', async (req, res, next) => {
    try {
      const limit = Math.min(12, Math.max(1, Number(req.query['limit'] ?? 8) || 8));
      const docs = await Review.find({ isApproved: true, rating: { $gte: 4 } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('user', 'name')
        .populate('product', 'name slug')
        .lean();
      const items = docs
        .filter((d) => d.product && typeof d.product === 'object')
        .map((d) => {
          const u = d.user as unknown as { name?: string } | null;
          const p = d.product as unknown as { name: string; slug: string };
          return {
            id: String(d._id),
            rating: d.rating,
            title: d.title ?? undefined,
            body: d.body,
            userName: u?.name ?? 'Customer',
            productName: p.name,
            productSlug: p.slug,
            createdAt: (d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt)).toISOString(),
          };
        });
      res.json({ items });
    } catch (err) {
      next(err);
    }
  });

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

  // Verified-buyer review, no account required.
  //
  // Guest checkout is the norm here, so gating reviews behind requireAuth meant
  // almost nobody could leave one — the store had zero social proof. Proof of
  // purchase is the order number + the phone it was placed with, exactly the pair
  // used by order tracking (decision #51), so an order number alone is never enough.
  router.post('/products/:slug/reviews/verified', reviewLimiter, async (req, res, next) => {
    try {
      const parsed = verifiedReviewSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const { orderNumber, phone, ...review } = parsed.data;

      const product = await Product.findOne({ slug: req.params['slug'], isActive: true }).select('_id').lean();
      if (!product) throw new HttpError(404, 'Product not found', 'not_found');

      // One 404 for "no such order" and "wrong phone" alike, so this cannot be used
      // to probe which order numbers exist.
      const order = await Order.findOne({ orderNumber: orderNumber.toUpperCase(), 'customer.phone': phone }).lean();
      if (!order) throw new HttpError(404, 'We could not find that order', 'not_found');

      if (order.status === 'cancelled') {
        throw new HttpError(403, 'That order was cancelled', 'not_purchased');
      }
      const bought = order.items.some((i) => String(i.product) === String(product._id));
      if (!bought) throw new HttpError(403, 'That order does not include this product', 'not_purchased');

      if (await Review.exists({ product: product._id, orderNumber: order.orderNumber })) {
        throw new HttpError(409, 'This order has already reviewed this product', 'already_reviewed');
      }

      const doc = await Review.create({
        ...review,
        product: product._id,
        orderNumber: order.orderNumber,
        // First name only — a public review must never expose a customer's full
        // identity, and never their phone.
        guestName: (order.customer?.name ?? 'Customer').trim().split(/\s+/)[0],
        isApproved: false,
      });
      res.status(201).json(toReviewDTO(doc.toObject()));
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        return next(new HttpError(409, 'This order has already reviewed this product', 'already_reviewed'));
      }
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
