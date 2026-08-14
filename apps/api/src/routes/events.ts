import { Router, json, type RequestHandler } from 'express';
import { trackBatchSchema } from '@herencia/shared';
import { ingestBatch } from '../modules/analytics/service';
import { eventsLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/error';

export function eventsRouter(): Router {
  const router = Router();

  // navigator.sendBeacon labels a string body `text/plain`, which the app-level
  // express.json() ignores — so the body arrived empty and every beacon 400'd.
  //
  // The tempting fix is to send a Blob typed application/json, but that breaks in
  // production: the API is a different origin there, application/json is not a
  // CORS-safelisted content type, and sendBeacon cannot perform a preflight. So the
  // client keeps sending text/plain and the server parses it as JSON here.
  const parseBeacon = json({ type: ['application/json', 'text/plain'], limit: '64kb' });

  // A body-parser SyntaxError would otherwise surface as a 500. This endpoint is
  // public and unauthenticated, so junk payloads are routine — they belong in the
  // 4xx bucket, not in the server-error logs.
  const parseBeaconSafe: RequestHandler = (req, res, next) => {
    parseBeacon(req, res, (err?: unknown) => {
      if (err) return next(new HttpError(400, 'Invalid tracking payload', 'invalid_payload'));
      next();
    });
  };

  router.post('/events', eventsLimiter, parseBeaconSafe, async (req, res, next) => {
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
