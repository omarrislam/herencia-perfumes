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
