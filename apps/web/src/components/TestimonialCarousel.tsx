import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { fetchReviewHighlights } from '../lib/api';

type Item = { rating: number; title?: string; body: string; userName: string; productName: string; productSlug?: string };

// Shown only until real approved reviews exist (Admin → Reviews). Deliberately
// product-agnostic so they can never reference a deleted product / dead link.
const FALLBACK: Item[] = [
  { rating: 5, title: 'Compliments every time', body: 'The first scent strangers stop me to ask about — I have never worn anything like it.', userName: 'Yara H.', productName: '' },
  { rating: 5, title: 'A gift worth giving', body: 'The gift box alone felt like a luxury — my father hasn’t taken it off since.', userName: 'Karim S.', productName: '' },
  { rating: 5, title: 'Lasts all day', body: 'Finally a house that lasts all day without shouting. Quiet, deep, unforgettable.', userName: 'Nour A.', productName: '' },
];

function Stars({ n }: { n: number }) {
  return (
    <span className="font-body text-xl tracking-[0.25em] text-accent" aria-label={`Rated ${n} out of 5`}>
      {'★'.repeat(n)}
      <span className="text-hairline">{'★'.repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

export function TestimonialCarousel() {
  const q = useQuery({ queryKey: ['review-highlights'], queryFn: fetchReviewHighlights });
  const items: Item[] = q.data?.items?.length ? q.data.items : FALLBACK;
  const reduce = useReducedMotion();
  const [[i, dir], setState] = useState<[number, number]>([0, 0]);
  const idx = ((i % items.length) + items.length) % items.length;
  const t = items[idx]!;
  const go = (d: number) => setState([i + d, d]);
  const dx = reduce ? 0 : 40;

  const arrow = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline font-body text-content transition-colors hover:border-accent hover:text-accent';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3 sm:gap-6">
        <button type="button" aria-label="Previous review" onClick={() => go(-1)} className={arrow}>←</button>

        <div className="relative min-h-[190px] min-w-0 flex-1">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={idx}
              custom={dir}
              initial={{ opacity: 0, x: dir >= 0 ? dx : -dx }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir >= 0 ? -dx : dx }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="text-center"
            >
              <Stars n={Math.round(t.rating)} />
              {t.title && <h3 className="display mt-4 text-2xl text-content md:text-3xl">“{t.title}”</h3>}
              <p className="mx-auto mt-3 max-w-xl font-body leading-relaxed text-muted line-clamp-3">{t.body}</p>
              <p className="mt-5 font-body text-sm text-muted">
                <span className="text-content">{t.userName}</span>
                {t.productName && (
                  <>
                    {' '}on{' '}
                    {t.productSlug ? (
                      <Link to={`/products/${t.productSlug}`} className="text-accent hover:underline">{t.productName}</Link>
                    ) : (
                      t.productName
                    )}
                  </>
                )}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <button type="button" aria-label="Next review" onClick={() => go(1)} className={arrow}>→</button>
      </div>

      {/* dots */}
      <div className="mt-6 flex items-center justify-center gap-1.5">
        {items.map((_, n) => (
          <button
            key={n}
            type="button"
            aria-label={`Go to review ${n + 1}`}
            onClick={() => setState([n, n > idx ? 1 : -1])}
            className={`h-1.5 rounded-full transition-all ${n === idx ? 'w-5 bg-accent' : 'w-1.5 bg-hairline hover:bg-accent/50'}`}
          />
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link to={t.productSlug ? `/products/${t.productSlug}` : '/products'} className="link-underline font-body text-sm text-accent">
          View all reviews →
        </Link>
      </div>
    </div>
  );
}
