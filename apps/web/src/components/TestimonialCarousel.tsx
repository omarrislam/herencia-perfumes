import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchReviewHighlights } from '../lib/api';

type Item = { rating: number; title?: string; body: string; userName: string; productName: string; productSlug?: string };

const FALLBACK: Item[] = [
  { rating: 5, title: 'Compliments every time', body: 'Royal Oud is the first scent strangers stop me to ask about.', userName: 'Yara H.', productName: 'Royal Oud', productSlug: 'royal-oud' },
  { rating: 5, title: 'A gift worth giving', body: 'The gift box alone felt like a luxury — my father hasn’t taken it off since.', userName: 'Karim S.', productName: 'Heritage Trio', productSlug: 'heritage-trio' },
  { rating: 5, title: 'Lasts all day', body: 'Finally a house that lasts all day without shouting. Amber Noir is a masterpiece.', userName: 'Nour A.', productName: 'Amber Noir', productSlug: 'amber-noir' },
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
  const [i, setI] = useState(0);
  const t = items[i % items.length]!;
  const go = (d: number) => setI((p) => (p + d + items.length) % items.length);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3 sm:gap-6">
        <button
          type="button"
          aria-label="Previous review"
          onClick={() => go(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline font-body text-content transition-colors hover:border-accent hover:text-accent"
        >
          ←
        </button>

        <div className="min-w-0 flex-1 text-center">
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
        </div>

        <button
          type="button"
          aria-label="Next review"
          onClick={() => go(1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline font-body text-content transition-colors hover:border-accent hover:text-accent"
        >
          →
        </button>
      </div>

      <div className="mt-8 text-center">
        <Link to={t.productSlug ? `/products/${t.productSlug}` : '/products'} className="link-underline font-body text-sm text-accent">
          View all reviews →
        </Link>
      </div>
    </div>
  );
}
