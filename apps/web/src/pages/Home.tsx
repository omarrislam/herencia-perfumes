import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchProducts, fetchSettings } from '../lib/api';
import { cld } from '../lib/cloudinary';
import { useSeo } from '../lib/useSeo';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { Skeleton } from '../components/Skeleton';
import { BannerStrip } from '../components/BannerStrip';
import { Reveal } from '../components/Reveal';

export default function Home() {
  useSeo({ title: 'HERENCIA — Luxury in every drop', description: 'Heritage luxury perfumery.' });
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const featured = useQuery({ queryKey: ['products', 'featured'], queryFn: () => fetchProducts({ sort: 'rating', page: 1 }) });
  const featuredItems = (featured.data?.items ?? []).filter((p) => p.isFeatured).slice(0, 4);
  const hero = settings.data?.hero;
  const heroPublicId = hero?.image;

  useEffect(() => {
    if (!heroPublicId) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = cld(heroPublicId, { w: 1200 });
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, [heroPublicId]);

  return (
    <div className="space-y-16 md:space-y-24">
      <BannerStrip placement="home_hero" />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl shadow-lux">
        {hero ? (
          <ProductImage
            publicId={hero.image}
            alt={hero.title}
            w={1600}
            loading="eager"
            sizes="100vw"
            className="h-[30rem] w-full object-cover md:h-[36rem]"
          />
        ) : (
          <Skeleton className="h-[30rem] w-full md:h-[36rem]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-ink/10" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-2xl space-y-5 px-7 md:px-14">
            <p className="eyebrow text-gold-hi">Heritage Perfumery</p>
            <h1 className="display text-4xl text-cream md:text-6xl">
              {hero?.title ?? 'Luxury in every drop'}
            </h1>
            <p className="max-w-md font-body text-base leading-relaxed text-cream/80 md:text-lg">
              {hero?.subtitle ?? 'Composed in small batches, worn like an heirloom.'}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to={hero?.ctaLink ?? '/products'} className="btn-lux">
                {hero?.ctaText ?? 'Shop the collection'}
              </Link>
              <Link
                to="/find-your-scent"
                className="btn-outline border-cream/40 text-cream hover:bg-cream hover:text-ink"
              >
                Find your scent
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Values strip */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-3">
        {[
          ['Small-batch', 'Composed in limited runs'],
          ['Cash on delivery', 'Pay when it arrives'],
          ['Free shipping', 'On orders over 2,000 EGP'],
        ].map(([title, sub]) => (
          <div key={title} className="bg-surface px-6 py-7 text-center">
            <p className="font-display text-lg text-content">{title}</p>
            <p className="mt-1 font-body text-sm text-muted">{sub}</p>
          </div>
        ))}
      </div>

      <BannerStrip placement="home_strip" />

      {/* Featured */}
      <Reveal>
        <section>
          <div className="mb-8 text-center">
            <p className="eyebrow">The Collection</p>
            <h2 className="display mt-2 text-3xl text-content md:text-4xl">Featured scents</h2>
            <div className="rule-gold mx-auto mt-4 w-24" />
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-6">
            {featured.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-xl" />)
              : featuredItems.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {!featured.isLoading && featuredItems.length === 0 && (
            <p className="text-center font-body text-muted">No featured products yet.</p>
          )}
          <div className="mt-10 text-center">
            <Link to="/products" className="btn-outline">View all perfumes</Link>
          </div>
        </section>
      </Reveal>

      {/* Quiz CTA band */}
      <Reveal>
        <section className="relative overflow-hidden rounded-2xl bg-ink px-8 py-16 text-center shadow-lux md:py-20">
          <p className="eyebrow text-gold-hi">Not sure where to start?</p>
          <h2 className="display mx-auto mt-3 max-w-2xl text-3xl text-cream md:text-4xl">
            Find your signature scent
          </h2>
          <p className="mx-auto mt-4 max-w-md font-body text-cream/70">
            A few questions reveal the family that suits you — and the bottle to match.
          </p>
          <Link
            to="/find-your-scent"
            className="btn-outline mt-8 border-cream/40 text-cream hover:bg-cream hover:text-ink"
          >
            Take the quiz
          </Link>
        </section>
      </Reveal>
    </div>
  );
}
