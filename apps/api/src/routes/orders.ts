import { Router } from 'express';
import { createOrderSchema } from '@herencia/shared';
import { HttpError } from '../middleware/error';
import { authenticate, requireAuth } from '../middleware/auth';
import { createOrder } from '../modules/order/service';
import { Order } from '../models/Order';
import { toOrderDTO } from '../lib/serialize';
import { orderLimiter } from '../middleware/rateLimit';

export function orderRouter(): Router {
  const router = Router();

  // Public checkout — attaches the user when a valid cookie is present.
  router.post('/', orderLimiter, authenticate, async (req, res, next) => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success)
        throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const result = await createOrder(parsed.data, req.user?.id);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', authenticate, requireAuth, async (req, res, next) => {
    try {
      const docs = await Order.find({ user: req.user!.id }).sort({ createdAt: -1 }).lean();
      res.json({ items: docs.map(toOrderDTO), total: docs.length, page: 1, pages: 1 });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
