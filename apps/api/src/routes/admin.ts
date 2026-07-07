import { Router } from 'express';
import { adminProductSchema, scentFamilySchema, slugify, updateOrderStatusSchema, updateReviewSchema, quizQuestionSchema, bannerSchema, blogPostSchema, updateSettingsSchema, noteIconSchema, ORDER_STATUS, ORDER_STATUS_TRANSITIONS, type OrderStatus } from '@herencia/shared';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { QuizQuestion } from '../models/QuizQuestion';
import { Banner } from '../models/Banner';
import { BlogPost } from '../models/BlogPost';
import { Setting } from '../models/Setting';
import { NoteIcon } from '../models/NoteIcon';
import { HttpError } from '../middleware/error';
import { requireAdmin } from '../middleware/requireAdmin';
import { isCloudinaryConfigured, signUploadParams } from '../lib/cloudinary';
import { toProductDTO, toScentFamilyDTO, toOrderDTO, toReviewDTO, toQuizQuestionAdminDTO, toBannerDTO, toBlogPostDTO, toSettingDTO, toNoteIconDTO } from '../lib/serialize';
import { recomputeProductRating } from '../modules/review/service';

export function adminRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  // ---- Settings (home CMS: hero, section toggles, InstaPay) ----
  router.put('/settings', async (req, res, next) => {
    try {
      const parsed = updateSettingsSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      // Flatten one level to dot-paths so a partial save doesn't clobber sibling
      // fields within hero / homeSections / instapay / socialLinks.
      const $set: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parsed.data)) {
        if (v === undefined) continue;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          for (const [k2, v2] of Object.entries(v)) {
            if (v2 !== undefined) $set[`${k}.${k2}`] = v2;
          }
        } else {
          $set[k] = v;
        }
      }
      const s = await Setting.findOneAndUpdate({}, { $set }, { new: true, upsert: true }).lean();
      res.json(toSettingDTO(s));
    } catch (err) {
      next(err);
    }
  });

  // ---- Scent families ----
  router.post('/scent-families', async (req, res, next) => {
    try {
      const parsed = scentFamilySchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await ScentFamily.create({ ...data, slug: data.slug ?? slugify(data.name) });
      res.status(201).json(toScentFamilyDTO(doc.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.put('/scent-families/:id', async (req, res, next) => {
    try {
      const parsed = scentFamilySchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await ScentFamily.findByIdAndUpdate(
        req.params['id'],
        { ...data, slug: data.slug ?? slugify(data.name) },
        { new: true },
      ).lean();
      if (!doc) throw new HttpError(404, 'Scent family not found', 'not_found');
      res.json(toScentFamilyDTO(doc));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/scent-families/:id', async (req, res, next) => {
    try {
      const inUse = await Product.countDocuments({ scentFamily: req.params['id'] });
      if (inUse > 0) throw new HttpError(409, 'Scent family is in use by products', 'conflict');
      const doc = await ScentFamily.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Scent family not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Products / bundles ----
  router.post('/products', async (req, res, next) => {
    try {
      const parsed = adminProductSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await Product.create({ ...data, slug: data.slug ?? slugify(data.name) });
      const populated = await doc.populate('scentFamily');
      res.status(201).json(toProductDTO(populated.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.put('/products/:id', async (req, res, next) => {
    try {
      const parsed = adminProductSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await Product.findById(req.params['id']);
      if (!doc) throw new HttpError(404, 'Product not found', 'not_found');
      doc.set({ ...data, slug: data.slug ?? slugify(data.name) });
      await doc.save(); // re-runs pre('validate') → basePrice/slug
      const populated = await doc.populate('scentFamily');
      res.json(toProductDTO(populated.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/products/:id', async (req, res, next) => {
    try {
      const doc = await Product.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Product not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Note icons (custom fragrance-note images) ----
  router.post('/notes', async (req, res, next) => {
    try {
      const parsed = noteIconSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const name = parsed.data.name.toLowerCase().trim();
      // Upsert by name so re-uploading an icon simply replaces the image.
      const doc = await NoteIcon.findOneAndUpdate(
        { name },
        { name, image: parsed.data.image },
        { new: true, upsert: true },
      ).lean();
      res.status(201).json(toNoteIconDTO(doc));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/notes/:id', async (req, res, next) => {
    try {
      const doc = await NoteIcon.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Note icon not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Cloudinary signed upload ----
  router.post('/uploads/sign', (req, res, next) => {
    try {
      if (!isCloudinaryConfigured()) throw new HttpError(503, 'Image uploads are not configured', 'unconfigured');
      res.json(signUploadParams('herencia'));
    } catch (err) {
      next(err);
    }
  });

  // ---- Orders ----
  router.get('/orders', async (req, res, next) => {
    try {
      const status = req.query['status'];
      const filter: Record<string, unknown> = {};
      if (typeof status === 'string') {
        if (!ORDER_STATUS.includes(status as OrderStatus)) throw new HttpError(400, 'Invalid status', 'invalid');
        filter['status'] = status;
      }
      const page = Math.max(1, Number(req.query['page'] ?? 1) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 20) || 20));
      const [docs, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Order.countDocuments(filter),
      ]);
      res.json({ items: docs.map(toOrderDTO), total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
      next(err);
    }
  });

  router.put('/orders/:id/status', async (req, res, next) => {
    try {
      const parsed = updateOrderStatusSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const order = await Order.findById(req.params['id']);
      if (!order) throw new HttpError(404, 'Order not found', 'not_found');
      const from = order.status as OrderStatus;
      const to = parsed.data.status;
      if (from !== to && !ORDER_STATUS_TRANSITIONS[from].includes(to)) {
        throw new HttpError(422, `Cannot move an order from ${from} to ${to}`, 'invalid_transition');
      }
      order.status = to;
      await order.save();
      res.json(toOrderDTO(order.toObject()));
    } catch (err) {
      next(err);
    }
  });

  // ---- Reviews ----
  router.get('/reviews', async (req, res, next) => {
    try {
      const status = req.query['status'];
      const filter: Record<string, unknown> = {};
      if (status === 'pending') filter['isApproved'] = false;
      else if (status === 'approved') filter['isApproved'] = true;
      const page = Math.max(1, Number(req.query['page'] ?? 1) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 20) || 20));
      const [docs, total] = await Promise.all([
        Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name').lean(),
        Review.countDocuments(filter),
      ]);
      res.json({ items: docs.map(toReviewDTO), total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
      next(err);
    }
  });

  router.put('/reviews/:id', async (req, res, next) => {
    try {
      const parsed = updateReviewSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const doc = await Review.findByIdAndUpdate(req.params['id'], { isApproved: parsed.data.isApproved }, { new: true }).populate('user', 'name');
      if (!doc) throw new HttpError(404, 'Review not found', 'not_found');
      await recomputeProductRating(String(doc.product));
      res.json(toReviewDTO(doc.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/reviews/:id', async (req, res, next) => {
    try {
      const doc = await Review.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Review not found', 'not_found');
      await recomputeProductRating(String(doc.product));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Quiz ----
  router.get('/quiz', async (_req, res, next) => {
    try {
      const docs = await QuizQuestion.find().sort({ order: 1 }).lean();
      res.json(docs.map(toQuizQuestionAdminDTO));
    } catch (err) {
      next(err);
    }
  });
  router.post('/quiz', async (req, res, next) => {
    try {
      const parsed = quizQuestionSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const doc = await QuizQuestion.create(parsed.data);
      res.status(201).json(toQuizQuestionAdminDTO(doc.toObject()));
    } catch (err) {
      next(err);
    }
  });
  router.put('/quiz/:id', async (req, res, next) => {
    try {
      const parsed = quizQuestionSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const doc = await QuizQuestion.findByIdAndUpdate(req.params['id'], parsed.data, { new: true }).lean();
      if (!doc) throw new HttpError(404, 'Question not found', 'not_found');
      res.json(toQuizQuestionAdminDTO(doc));
    } catch (err) {
      next(err);
    }
  });
  router.delete('/quiz/:id', async (req, res, next) => {
    try {
      const doc = await QuizQuestion.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Question not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Banners ----
  router.get('/banners', async (_req, res, next) => {
    try {
      const docs = await Banner.find().sort({ order: 1, createdAt: -1 }).lean();
      res.json(docs.map(toBannerDTO));
    } catch (err) {
      next(err);
    }
  });
  router.post('/banners', async (req, res, next) => {
    try {
      const parsed = bannerSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const doc = await Banner.create(parsed.data);
      res.status(201).json(toBannerDTO(doc.toObject()));
    } catch (err) {
      next(err);
    }
  });
  router.put('/banners/:id', async (req, res, next) => {
    try {
      const parsed = bannerSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const doc = await Banner.findByIdAndUpdate(req.params['id'], parsed.data, { new: true }).lean();
      if (!doc) throw new HttpError(404, 'Banner not found', 'not_found');
      res.json(toBannerDTO(doc));
    } catch (err) {
      next(err);
    }
  });
  router.delete('/banners/:id', async (req, res, next) => {
    try {
      const doc = await Banner.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Banner not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Blog ----
  router.get('/blog', async (_req, res, next) => {
    try {
      const docs = await BlogPost.find().sort({ createdAt: -1 }).lean();
      res.json({ items: docs.map(toBlogPostDTO), total: docs.length, page: 1, pages: 1 });
    } catch (err) {
      next(err);
    }
  });
  router.post('/blog', async (req, res, next) => {
    try {
      const parsed = blogPostSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await BlogPost.create({
        ...data,
        slug: data.slug ? slugify(data.slug) : slugify(data.title),
        publishedAt: data.isPublished ? new Date() : undefined,
      });
      res.status(201).json(toBlogPostDTO(doc.toObject()));
    } catch (err) {
      next(err);
    }
  });
  router.put('/blog/:id', async (req, res, next) => {
    try {
      const parsed = blogPostSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const existing = await BlogPost.findById(req.params['id']);
      if (!existing) throw new HttpError(404, 'Post not found', 'not_found');
      const publishedAt = data.isPublished ? (existing.publishedAt ?? new Date()) : undefined;
      existing.set({ ...data, slug: data.slug ? slugify(data.slug) : slugify(data.title), publishedAt });
      await existing.save();
      res.json(toBlogPostDTO(existing.toObject()));
    } catch (err) {
      next(err);
    }
  });
  router.delete('/blog/:id', async (req, res, next) => {
    try {
      const doc = await BlogPost.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Post not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
