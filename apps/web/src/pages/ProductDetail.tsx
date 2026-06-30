import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProduct, fetchRelated } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { Gallery } from '../features/products/Gallery';
import { NotesPyramid } from '../features/products/NotesPyramid';
import { Price } from '../components/Price';
import { Rating } from '../components/Rating';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';
import { WishlistButton } from '../components/WishlistButton';
import { useCart } from '../features/cart/CartContext';

export default function ProductDetail() {
  const { slug = '' } = useParams();
  const product = useQuery({ queryKey: ['product', slug], queryFn: () => fetchProduct(slug), enabled: !!slug });
  const related = useQuery({ queryKey: ['product', slug, 'related'], queryFn: () => fetchRelated(slug), enabled: !!slug });
  const [sizeIdx, setSizeIdx] = useState(0);
  useEffect(() => { setSizeIdx(0); }, [slug]);
  const { addItem, setOpen } = useCart();

  useSeo({
    title: product.data ? `${product.data.name} — HERENCIA` : 'HERENCIA',
    description: product.data?.shortDesc,
  });

  if (product.isLoading) return <Skeleton className="h-96 w-full" />;
  if (product.isError || !product.data) return <p className="font-body text-muted">Product not found.</p>;

  const p = product.data;
  const size = p.sizes[sizeIdx] ?? p.sizes[0];

  return (
    <article className="space-y-12">
      <div className="grid gap-8 md:grid-cols-2">
        <Gallery images={p.images} alt={p.name} />
        <div className="space-y-5">
          <div>
            <p className="font-body text-sm uppercase tracking-wide text-accent">
              {p.scentFamily?.name} · {p.concentration} · {p.gender}
            </p>
            <h1 className="font-display text-3xl text-content">{p.name}</h1>
            <div className="mt-2"><Rating avg={p.rating.avg} count={p.rating.count} /></div>
          </div>
          <p className="font-body text-muted">{p.shortDesc}</p>

          {p.sizes.length > 1 ? (
            <div className="flex gap-2">
              {p.sizes.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  aria-pressed={i === sizeIdx}
                  onClick={() => setSizeIdx(i)}
                  className={`rounded-md border px-4 py-2 font-body text-sm ${
                    i === sizeIdx ? 'border-gold bg-gold/10 text-content' : 'border-line text-muted'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="text-2xl">
            <Price value={size?.price ?? p.basePrice} compareAt={size?.compareAtPrice} />
          </div>
          <p className="font-body text-sm text-muted">{(size?.stock ?? 0) > 0 ? 'In stock' : 'Out of stock'}</p>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={(size?.stock ?? 0) === 0}
              onClick={() => {
                if (!size) return;
                addItem({ productId: p.id, sizeLabel: size.label, qty: 1 });
                setOpen(true);
              }}
              className="flex-1 rounded-md bg-maroon px-4 py-3 font-body text-sm text-cream transition-colors hover:bg-maroon/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(size?.stock ?? 0) === 0 ? 'Out of stock' : 'Add to cart'}
            </button>
            <WishlistButton productId={p.id} />
          </div>

          {p.type === 'bundle' && p.bundleItems?.length ? (
            <div>
              <h2 className="mb-2 font-display text-lg text-content">This bundle includes</h2>
              <ul className="list-disc pl-5 font-body text-content">
                {p.bundleItems.map((b, i) => (
                  <li key={i}>
                    {typeof b.product === 'object' ? `${b.product.name} \xd7${b.qty}` : `Item \xd7${b.qty}`}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <NotesPyramid notes={p.notes} />
          <div className="prose max-w-none whitespace-pre-line font-body text-content">{p.description}</div>
        </div>
      </div>

      {related.data && related.data.length > 0 ? (
        <section>
          <h2 className="mb-4 font-display text-2xl text-content">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.data.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      ) : null}
    </article>
  );
}
