import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProduct, fetchRelated } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { productTitle } from '@herencia/shared';
import { track, flush } from '../lib/analytics';
import { Gallery } from '../features/products/Gallery';
import { NotesPyramid } from '../features/products/NotesPyramid';
import { Price } from '../components/Price';
import { Rating } from '../components/Rating';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';
import { WishlistButton } from '../components/WishlistButton';
import { TryScentButton } from '../components/TryScentButton';
import { WhatsAppAsk } from '../components/WhatsAppAsk';
import { useCart } from '../features/cart/CartContext';
import { ReviewsSection } from '../features/reviews/ReviewsSection';

export default function ProductDetail() {
  const { slug = '' } = useParams();
  const product = useQuery({ queryKey: ['product', slug], queryFn: () => fetchProduct(slug), enabled: !!slug });
  const related = useQuery({ queryKey: ['product', slug, 'related'], queryFn: () => fetchRelated(slug), enabled: !!slug });
  const [sizeIdx, setSizeIdx] = useState(0);
  useEffect(() => { setSizeIdx(0); }, [slug]);
  const { addItem, setOpen } = useCart();

  // Must match the server-rendered title in api lib/seo.ts, or hydration replaces the
  // baked title with a shorter one and a JS-rendering crawler indexes that instead.
  useSeo({
    title: product.data ? productTitle(product.data) : 'HERENCIA',
    description: product.data?.shortDesc,
  });

  // Flushed rather than left queued: a PDP is where visitors linger and then leave,
  // so batching this until the next route change loses it on a hard navigation.
  const viewedSlug = product.data?.slug;
  useEffect(() => {
    if (!viewedSlug) return;
    track('product_view', { path: `/products/${viewedSlug}`, productSlug: viewedSlug });
    void flush();
  }, [viewedSlug]);

  if (product.isLoading) return <Skeleton className="h-96 w-full" />;
  if (product.isError || !product.data) return <p className="font-body text-muted">Product not found.</p>;

  const p = product.data;
  const size = p.sizes[sizeIdx] ?? p.sizes[0];

  return (
    <article className="space-y-20">
      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        <div className="md:sticky md:top-24 md:self-start">
          <Gallery images={p.images} alt={p.name} />
        </div>
        <div className="space-y-6">
          <div>
            <p className="eyebrow">
              {[p.scentFamily?.name, p.concentration, p.gender].filter(Boolean).join(' · ')}
            </p>
            <h1 className="display mt-2 text-3xl text-content md:text-4xl">{p.name}</h1>
            <div className="mt-3"><Rating avg={p.rating.avg} count={p.rating.count} /></div>
          </div>
          <p className="max-w-prose font-body leading-relaxed text-muted">{p.shortDesc}</p>

          <div className="rule-gold-left" />

          {p.sizes.length === 1 ? (
            // A single size still has to be stated — this block used to render nothing,
            // so the bottle size never appeared anywhere on the page.
            <div>
              <p className="eyebrow mb-2">Size</p>
              <p className="font-body text-lg text-content">{p.sizes[0]!.label}</p>
            </div>
          ) : p.sizes.length > 1 ? (
            <div>
              <p className="eyebrow mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {p.sizes.map((s, i) => (
                  <button
                    key={s.label}
                    type="button"
                    aria-pressed={i === sizeIdx}
                    onClick={() => setSizeIdx(i)}
                    className={`rounded-md border px-5 py-2.5 font-body text-sm transition-colors ${
                      i === sizeIdx
                        ? 'border-accent bg-accent text-surface'
                        : 'border-line text-muted hover:border-accent hover:text-content'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-baseline gap-3 text-3xl">
            <Price value={size?.price ?? p.basePrice} compareAt={size?.compareAtPrice} />
          </div>
          <p className="font-body text-sm text-muted">
            {(size?.stock ?? 0) > 0 ? '✓ In stock — ready to ship' : 'Currently out of stock'}
          </p>

          <div className="flex items-stretch gap-3">
            <button
              type="button"
              disabled={(size?.stock ?? 0) === 0}
              onClick={() => {
                if (!size) return;
                addItem({ productId: p.id, sizeLabel: size.label, qty: 1 });
                track('add_to_cart', { productSlug: p.slug });
                setOpen(true);
              }}
              className="btn-lux flex-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {(size?.stock ?? 0) === 0 ? 'Out of stock' : 'Add to cart'}
            </button>
            <WishlistButton productId={p.id} />
          </div>

          {p.type === 'perfume' && p.sampleStock > 0 && (
            <TryScentButton
              product={p}
              className="mt-3 w-full rounded-md border border-hairline py-3 font-body text-sm font-medium tracking-wide text-content transition-colors hover:border-accent hover:text-accent"
            />
          )}

          <WhatsAppAsk text={`Hi HERENCIA! I have a question about ${p.name}.`} className="mt-3 text-center" />

          {p.type === 'bundle' && p.bundleItems?.length ? (
            <div className="card-lux rounded-xl p-5">
              <p className="eyebrow mb-3">This bundle includes</p>
              <ul className="space-y-2 font-body text-content">
                {p.bundleItems.map((b) => (
                  <li key={typeof b.product === 'object' ? b.product.id : String(b.product)} className="flex items-center gap-2">
                    <span className="text-accent">—</span>
                    {typeof b.product === 'object' ? `${b.product.name} \xd7${b.qty}` : `Item \xd7${b.qty}`}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <NotesPyramid notes={p.notes} />
          <div className="prose-herencia whitespace-pre-line font-body text-content">{p.description}</div>
        </div>
      </div>

      <ReviewsSection slug={p.slug} productId={p.id} />

      {related.data && related.data.length > 0 ? (
        <section>
          <div className="mb-8 text-center">
            <p className="eyebrow">More to discover</p>
            <h2 className="display mt-2 text-2xl text-content md:text-3xl">You may also like</h2>
            <div className="rule-gold mx-auto mt-4 w-24" />
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-6">
            {related.data.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      ) : null}
    </article>
  );
}
