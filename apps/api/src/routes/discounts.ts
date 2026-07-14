import { Router } from 'express';
import { DiscountCode } from '../models/DiscountCode';
import { HttpError } from '../middleware/error';

// Public checkout preview: is this code valid, and what percent? The order
// service re-validates on placement — this only powers the summary preview.
export function discountRouter(): Router {
  const router = Router();

  router.get('/:code', async (req, res, next) => {
    try {
      const code = String(req.params['code'] ?? '').trim().toUpperCase();
      if (!code || code.length > 40) throw new HttpError(404, 'Invalid code', 'not_found');
      const dc = await DiscountCode.findOne({ code, isActive: true }).lean();
      if (!dc || (dc.expiresAt && new Date(dc.expiresAt) <= new Date())) {
        throw new HttpError(404, 'Invalid code', 'not_found');
      }
      res.json({ code: dc.code, percent: dc.percent });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
