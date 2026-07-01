import { Router } from 'express';
import { BANNER_PLACEMENT, type BannerPlacement } from '@herencia/shared';
import { Banner } from '../models/Banner';
import { HttpError } from '../middleware/error';
import { toBannerDTO } from '../lib/serialize';

export function bannerRouter(): Router {
  const router = Router();

  router.get('/banners', async (req, res, next) => {
    try {
      const now = new Date();
      const filter: Record<string, unknown> = {
        isActive: true,
        $and: [
          { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      };
      const placement = req.query['placement'];
      if (typeof placement === 'string') {
        if (!BANNER_PLACEMENT.includes(placement as BannerPlacement)) throw new HttpError(400, 'Invalid placement', 'invalid');
        filter['placement'] = placement;
      }
      const docs = await Banner.find(filter).sort({ order: 1, createdAt: -1 }).lean();
      res.json(docs.map(toBannerDTO));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
