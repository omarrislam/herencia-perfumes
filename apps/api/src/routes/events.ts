import { Router } from 'express';
import { trackBatchSchema } from '@herencia/shared';
import { ingestBatch } from '../modules/analytics/service';
import { eventsLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/error';

export function eventsRouter(): Router {
  const router = Router();

  router.post('/events', eventsLimiter, async (req, res, next) => {
    const parsed = trackBatchSchema.safeParse(req.body);
    if (!parsed.success) return next(new HttpError(400, 'Invalid tracking payload', 'invalid_payload'));

    try {
      await ingestBatch(parsed.data, req.get('user-agent'));
    } catch (err) {
      // Analytics must never surface to a visitor: log it and answer 204 anyway.
      console.error('[events] ingest failed', err);
    }
    res.status(204).end();
  });

  return router;
}
