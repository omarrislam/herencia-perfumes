import { Router } from 'express';
import { Setting } from '../models/Setting';
import { HttpError } from '../middleware/error';

export const settingsRouter = Router();

settingsRouter.get('/settings', async (_req, res, next) => {
  try {
    const s = await Setting.findOne().lean();
    if (!s) throw new HttpError(404, 'Settings not configured', 'not_found');
    res.json({
      whatsappNumber: s.whatsappNumber,
      shippingFee: s.shippingFee,
      freeShippingThreshold: s.freeShippingThreshold ?? undefined,
      socialLinks: s.socialLinks ?? {},
      hero: s.hero,
      contactEmail: s.contactEmail ?? undefined,
    });
  } catch (err) {
    next(err);
  }
});
