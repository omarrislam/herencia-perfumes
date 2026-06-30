import { Router } from 'express';
import { adminProductSchema, scentFamilySchema, slugify } from '@herencia/shared';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';
import { HttpError } from '../middleware/error';
import { requireAdmin } from '../middleware/requireAdmin';
import { isCloudinaryConfigured, signUploadParams } from '../lib/cloudinary';
import { toProductDTO, toScentFamilyDTO } from '../lib/serialize';

export function adminRouter(opts: { adminToken: string }): Router {
  const router = Router();
  router.use(requireAdmin(opts.adminToken));

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

  // ---- Cloudinary signed upload ----
  router.post('/uploads/sign', (req, res, next) => {
    try {
      if (!isCloudinaryConfigured()) throw new HttpError(503, 'Image uploads are not configured', 'unconfigured');
      res.json(signUploadParams('herencia'));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
