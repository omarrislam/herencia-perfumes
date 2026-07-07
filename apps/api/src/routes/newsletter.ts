import { Router } from 'express';
import { z } from 'zod';
import { Subscriber } from '../models/Subscriber';
import { Setting } from '../models/Setting';
import { HttpError } from '../middleware/error';
import { makeLimiter } from '../middleware/rateLimit';

const subscribeSchema = z.object({ email: z.string().email().max(120) });
const newsletterLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

export function newsletterRouter(): Router {
  const router = Router();

  // Public email capture — idempotent on duplicate email, returns the popup
  // discount code so the client can apply it at checkout.
  router.post('/newsletter', newsletterLimiter, async (req, res, next) => {
    try {
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'Please enter a valid email address', 'invalid');
      const email = parsed.data.email.toLowerCase().trim();
      try {
        await Subscriber.create({ email, source: 'popup' });
      } catch (err) {
        if ((err as { code?: number }).code !== 11000) throw err; // already subscribed → still return the code
      }
      const setting = await Setting.findOne().lean();
      const popup = setting?.emailPopup;
      res.status(201).json({
        ok: true,
        code: popup?.enabled ? (popup.code ?? null) : null,
        discountPercent: popup?.enabled ? (popup.discountPercent ?? null) : null,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
