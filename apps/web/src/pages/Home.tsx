import { useEffect, type ReactNode } from 'react';
import type { ReorderableSection } from '@herencia/shared';
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

const FAQ: { q: string; a: string }[] = [
  { q: 'Not sure which scent suits you?', a: 'Take the Find Your Scent quiz — a few questions reveal the family that fits you and the bottle to match.' },
  { q: 'How can I pay?', a: 'Cash on delivery across Egypt, or InstaPay — transfer and send us the screenshot on WhatsApp to confirm.' },
  { q: 'Do you deliver nationwide?', a: 'Yes, we ship across Egypt. Delivery is free on orders over 2,000 EGP.' },
  { q: 'How are the perfumes made?', a: 'Each scent is composed from rare raw materials and layered by hand in small batches — never mass-produced.' },
];

export default function Home() {
  useSeo({ title: 'HERENCIA — Luxury in every drop', description: 'Heritage luxury perfumery.' });
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const featured = useQuery({ queryKey: ['products', 'featured'], queryFn: () => fetchProducts({ sort: 'rating', page: 1 }) });
  const featuredItems = (featured.data?.items ?? []).filter((p) => p.isFeatured).slice(0, 4);
  const hero = settings.data?.hero;
  // Prefer an admin-uploaded Cloudinary hero; otherwise use the brand swirl.
  const heroPublicId = hero?.image;
  const useCloudHero = !!heroPublicId && /^https?:\/\//.test(cld(heroPublicId));

  useEffect(() => {
    if (!useCloudHero || !heroPublicId) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = cld(heroPublicId, { w: 1600 });
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, [heroPublicId, useCloudHero]);

  const sec = settings.data?.homeSections;
  const show = (k: keyof NonNullable<typeof sec>) => (sec ? sec[k] : true);
  const order: ReorderableSection[] = settings.data?.sectionOrder ?? ['essence', 'featured', 'gifting', 'craft', 'values', 'quiz', 'faq'];

  const sectionMap: Record<ReorderableSection, ReactNode> = {
    essence: (
      <Reveal>
        <section className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
          <div className="overflow-hidden rounded-2xl shadow-lux">
            <img src="/essence.png" alt="Herencia raw materials on gold silk" loading="lazy" className="aspect-square w-full object-cover" />
          </div>
          <div>
            <p className="eyebrow">The Essence of Heritage</p>
            <h2 className="display mt-3 text-3xl text-content md:text-4xl">Composed from the rarest materials</h2>
            <p className="mt-4 max-w-md font-body leading-relaxed text-muted">
              Madagascar vanilla, star anise, aged sandalwood — every HERENCIA scent is a study in
              patience, layered by hand in small batches and left to mature.
            </p>
            <Link to="/products" className="btn-outline mt-6">Explore the notes</Link>
          </div>
        </section>
      </Reveal>
    ),
    featured: (
      <Reveal>
        <section>
          <div className="mb-10 text-center">
            <p className="eyebrow">The Collection</p>
            <h2 className="display mt-2 text-3xl text-content md:text-4xl">Featured scents</h2>
            <div className="rule-gold mx-auto mt-4 w-24" />
          </div>
          <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 sm:mx-0 sm:px-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:pb-0">
            {featured.isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="min-w-[68%] shrink-0 snap-start sm:min-w-[45%] md:min-w-0"><Skeleton className="aspect-[4/5] rounded-xl" /></div>
                ))
              : featuredItems.map((p) => (
                  <div key={p.id} className="min-w-[68%] shrink-0 snap-start sm:min-w-[45%] md:min-w-0"><ProductCard product={p} /></div>
                ))}
          </div>
          {!featured.isLoading && featuredItems.length === 0 && (
            <p className="text-center font-body text-muted">No featured products yet.</p>
          )}
          <div className="mt-10 text-center"><Link to="/products" className="btn-outline">View all perfumes</Link></div>
        </section>
      </Reveal>
    ),
    gifting: (
      <Reveal>
        <section className="relative overflow-hidden rounded-2xl shadow-lux">
          <img src="/giftbox.png" alt="Herencia maroon gift box" loading="lazy" className="h-[360px] w-full object-cover md:h-[460px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-espresso/90 via-espresso/55 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-md px-7 md:px-12">
              <p className="eyebrow text-gold-hi">Ready to gift</p>
              <h2 className="display mt-3 text-3xl text-cream md:text-4xl">The art of gifting</h2>
              <p className="mt-3 max-w-sm font-body text-cream/80">
                Curated sets in our signature maroon box — an heirloom before it is even opened.
              </p>
              <Link to="/bundles" className="btn-lux mt-6">Shop bundles</Link>
            </div>
          </div>
        </section>
      </Reveal>
    ),
    craft: (
      <Reveal>
        <section className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
          <div className="order-2 md:order-1">
            <p className="eyebrow">The Atelier</p>
            <h2 className="display mt-3 text-3xl text-content md:text-4xl">Perfumery as inheritance</h2>
            <p className="mt-4 max-w-md font-body leading-relaxed text-muted">
              From the apothecary&apos;s bench to your dresser — blended, aged, and bottled by hand,
              the way it has always been done.
            </p>
            <Link to="/blog" className="btn-outline mt-6">Read the journal</Link>
          </div>
          <div className="order-1 overflow-hidden rounded-2xl shadow-lux md:order-2">
            <img src="/apothecary.png" alt="Herencia apothecary" loading="lazy" className="aspect-square w-full object-cover" />
          </div>
        </section>
      </Reveal>
    ),
    values: (
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
    ),
    quiz: (
      <Reveal>
        <section className="relative overflow-hidden rounded-2xl bg-espresso px-6 py-16 text-center shadow-lux md:py-20">
          <p className="eyebrow text-gold-hi">Not sure where to start?</p>
          <h2 className="display mx-auto mt-3 max-w-2xl text-3xl text-cream md:text-4xl">Find your signature scent</h2>
          <p className="mx-auto mt-4 max-w-md font-body text-cream/70">A few questions reveal the family that suits you — and the bottle to match.</p>
          <Link to="/find-your-scent" className="btn-outline mt-8 border-cream/40 text-cream hover:bg-cream hover:text-espresso">Take the quiz</Link>
        </section>
      </Reveal>
    ),
    faq: (
      <Reveal>
        <section>
          <div className="mb-8 text-center">
            <p className="eyebrow">Good to know</p>
            <h2 className="display mt-2 text-3xl text-content md:text-4xl">Questions, answered</h2>
            <div className="rule-gold mx-auto mt-4 w-24" />
          </div>
          <div className="mx-auto max-w-2xl divide-y divide-hairline border-y border-hairline">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg text-content">
                  {f.q}
                  <span className="text-accent transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 font-body leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </Reveal>
    ),
  };

  return (
    <div>
      {/* Full-bleed hero */}
      {show('hero') && (
        <section className="relative overflow-hidden">
          {settings.data ? (
            useCloudHero && heroPublicId ? (
              <ProductImage publicId={heroPublicId} alt={hero?.title ?? 'HERENCIA'} w={1920} loading="eager" sizes="100vw" className="h-[72vh] max-h-[760px] min-h-[440px] w-full object-cover" />
            ) : (
              <img src="/hero-swirl.png" alt={hero?.title ?? 'HERENCIA'} className="h-[72vh] max-h-[760px] min-h-[440px] w-full object-cover" />
            )
          ) : (
            <Skeleton className="h-[72vh] max-h-[760px] min-h-[440px] w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-espresso/90 via-espresso/45 to-espresso/15" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-espresso/55 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
              <div className="max-w-2xl space-y-6">
                <p className="eyebrow text-gold-hi">Heritage Perfumery</p>
                <h1 className="display text-5xl leading-[1.02] text-cream sm:text-6xl md:text-7xl">{hero?.title ?? 'Luxury in every drop'}</h1>
                <p className="max-w-md font-body text-base leading-relaxed text-cream/85 md:text-lg">{hero?.subtitle ?? 'Composed in small batches, worn like an heirloom.'}</p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link to={hero?.ctaLink ?? '/products'} className="btn-lux">{hero?.ctaText ?? 'Shop the collection'}</Link>
                  <Link to="/find-your-scent" className="btn-outline border-cream/40 text-cream hover:bg-cream hover:text-espresso">Find your scent</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Full-width bars */}
      <BannerStrip placement="global_top" />
      <BannerStrip placement="home_strip" />

      {/* Contained content, in the admin-configured order */}
      <div className="mx-auto max-w-6xl space-y-20 px-5 py-16 sm:px-6 md:space-y-28 md:py-24">
        {order.filter((k) => show(k)).map((k) => (
          <div key={k}>{sectionMap[k]}</div>
        ))}
      </div>
    </div>
  );
}
