import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

export function makeLimiter(opts: {
  windowMs: number;
  max: number;
  skipTest?: boolean;
}): RateLimitRequestHandler {
  const skipTest = opts.skipTest ?? true;
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => skipTest && process.env.NODE_ENV === 'test',
    handler: (_req, res) =>
      res.status(429).json({ error: { message: 'Too many requests, please try again later.', code: 'rate_limited' } }),
  });
}

// 15-minute windows tuned for a small storefront.
export const authLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
export const orderLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
export const reviewLimiter = makeLimiter({ windowMs: 60 * 60 * 1000, max: 10 });
// Order lookup is a guessable pair (order number + phone), so it gets its own
// bucket — generous for a customer refreshing, tight enough to stop enumeration,
// and separate from orderLimiter so tracking never blocks checkout.
export const trackLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

// Every visitor hits this, not just writers, and the client batches events before
// sending — so the ceiling is far higher than the write limiters. Generous by design:
// dropping real analytics is worse than absorbing a little noise.
export const eventsLimiter = makeLimiter({ windowMs: 60 * 1000, max: 60 });

// Back-in-stock requests: a real visitor asks once or twice, so this can be tight.
export const notifyLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
