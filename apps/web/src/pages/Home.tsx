import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_SECTION_ORDER, type ReorderableSection } from '@herencia/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { fetchProducts, fetchSettings } from '../lib/api';
import { cld, cldBlur } from '../lib/cloudinary';
import { readHeroCache, writeHeroCache } from '../lib/heroCache';
import { readListCache, writeListCache } from '../lib/listCache';
import { useSeo } from '../lib/useSeo';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';
import { Reveal } from '../components/Reveal';
import { ParallaxImage } from '../components/ParallaxImage';
import { ScentTrail } from '../components/ScentTrail';
import { WordReveal } from '../components/WordReveal';
import { HeroVideo } from '../components/HeroVideo';
import { ThreeSteps } from '../components/ThreeSteps';
import { TestimonialCarousel } from '../components/TestimonialCarousel';

// Simple inline icons for the values strip (single stroke weight).
const VALUE_ICONS: Record<string, JSX.Element> = {
  batch: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M9 3h6M10 3v6.5L5.5 17a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9.5V3" /><path d="M8 14h8" /></svg>
  ),
  cod: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><rect x="2.5" y="6.5" width="19" height="11" rx="2" /><circle cx="12" cy="12" r="2.3" /><path d="M6 12h.01M18 12h.01" /></svg>
  ),
  ship: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M3 6.5h10v9H3zM13 9.5h4l4 3.5v2.5h-8" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></svg>
  ),
  returns: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M3 8a9 9 0 1 1-1.5 5" /><path d="M3 3v5h5" /></svg>
  ),
};

const FAQ: { q: string; a: string }[] = [
  { q: 'Not sure which scent suits you?', a: 'Take the Find Your Scent quiz — a few questions reveal the family that fits you and the bottle to match.' },
  { q: 'How can I pay?', a: 'Cash on delivery across Egypt, or InstaPay — transfer and send us the screenshot on WhatsApp to confirm.' },
  { q: 'Do you deliver nationwide?', a: 'Yes, we ship across Egypt. Delivery is free on orders over 2,000 EGP.' },
  { q: 'How are the perfumes made?', a: 'Each scent is composed from rare raw materials and layered by hand in small batches — never mass-produced.' },
  { q: 'What if I change my mind?', a: 'Unopened items can be returned within 14 days of delivery for a full refund. See our Returns & refunds page for the details.' },
];

// Twinkling gold-dust positions for the quiz band (top%, left%, size px, delay s).
const SPARKLES: { top: string; left: string; size: number; delay: string }[] = [
  { top: '18%', left: '8%', size: 3, delay: '0s' }, { top: '70%', left: '14%', size: 2, delay: '1.2s' },
  { top: '32%', left: '22%', size: 2, delay: '2.4s' }, { top: '82%', left: '30%', size: 3, delay: '0.6s' },
  { top: '12%', left: '40%', size: 2, delay: '3.1s' }, { top: '60%', left: '48%', size: 3, delay: '1.8s' },
  { top: '26%', left: '58%', size: 2, delay: '0.9s' }, { top: '78%', left: '66%', size: 2, delay: '2.7s' },
  { top: '20%', left: '74%', size: 3, delay: '1.5s' }, { top: '66%', left: '82%', size: 2, delay: '3.4s' },
  { top: '38%', left: '90%', size: 3, delay: '0.3s' }, { top: '86%', left: '94%', size: 2, delay: '2.1s' },
];

export default function Home() {
  useSeo({ title: 'HERENCIA — Luxury in every drop', description: 'Heritage luxury perfumery.' });
  const reduced = useReducedMotion();
  // Scroll-away hero parallax: the image drifts slower than the page while the
  // copy lifts and dissolves. Transforms/opacity only — no layout, no CLS.
  const { scrollY } = useScroll();
  const heroImgY = useTransform(scrollY, [0, 600], [0, reduced ? 0 : 28]);
  const heroTextY = useTransform(scrollY, [0, 420], [0, reduced ? 0 : -32]);
  const heroTextOpacity = useTransform(scrollY, [0, 420], [1, reduced ? 1 : 0]);
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  // Blur-up: the sharp hero fades in as ONE piece once fully decoded (never a
  // half-painted progressive scan); a tiny blurred preview shows underneath.
  const [heroLoaded, setHeroLoaded] = useState(false);
  const heroImgRef = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete) setHeroLoaded(true); // already cached — skip the fade
  }, []);
  // Server-side featured filter — the old page-1 fetch + client slice(0,3)
  // capped the section at 3 and missed featured products beyond page 1.
  // Last-known list renders instantly from localStorage; fresh data replaces it.
  const featured = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const data = await fetchProducts({ featured: true, sort: 'rating', limit: 12 });
      writeListCache('featured', data);
      return data;
    },
    placeholderData: () => readListCache<import('@herencia/shared').ProductListDTO>('featured'),
  });
  const featuredItems = featured.data?.items ?? [];
  // With 3 or fewer the desktop shows a static 3-up grid; more become a
  // snap carousel with arrows (mobile always swipes).
  const featuredCarousel = featuredItems.length > 3;
  const featuredScroller = useRef<HTMLDivElement>(null);
  // Auto-advance stops for good once the visitor interacts — it exists only to
  // reveal that there are more cards, not to fight the user for the scrollbar.
  const featuredAutoStopped = useRef(false);
  // Native smooth scrollTo gets cancelled by Chrome in handler contexts —
  // tween scrollLeft manually instead (cubic ease-out).
  const tweenScroll = (el: HTMLElement, target: number, duration: number) => {
    const from = el.scrollLeft;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      el.scrollLeft = from + (target - from) * (1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const scrollFeatured = (dir: 1 | -1) => {
    const el = featuredScroller.current;
    if (!el) return;
    featuredAutoStopped.current = true; // arrow click = the user has found the carousel
    const step = (el.firstElementChild?.getBoundingClientRect().width ?? el.clientWidth / 3) + 24;
    const max = el.scrollWidth - el.clientWidth;
    const target = Math.max(0, Math.min(max, el.scrollLeft + dir * step));
    if (reduced) {
      el.scrollLeft = target;
      return;
    }
    tweenScroll(el, target, 350);
  };

  // Gentle auto-scroll (desktop carousel only): one card every 4s, wrapping back
  // to the start — the 3-up desktop view gives no visual hint of a 4th card.
  // Skipped entirely under reduced motion; paused while hovered, off-screen, or
  // the tab is hidden; stopped permanently on any pointer/wheel/touch interaction.
  useEffect(() => {
    if (!featuredCarousel || reduced) return;
    const el = featuredScroller.current;
    if (!el) return;
    featuredAutoStopped.current = false;
    let hovered = false;
    let visible = false;
    const stop = () => {
      featuredAutoStopped.current = true;
    };
    const onEnter = () => {
      hovered = true;
    };
    const onLeave = () => {
      hovered = false;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
    }, { threshold: 0.5 });
    io.observe(el);
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('pointerdown', stop);
    el.addEventListener('wheel', stop, { passive: true });
    el.addEventListener('touchstart', stop, { passive: true });
    const id = window.setInterval(() => {
      // Desktop-only: the mobile swipe view already peeks the next card.
      if (featuredAutoStopped.current || hovered || !visible || document.hidden) return;
      if (window.innerWidth < 768) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const step = (el.firstElementChild?.getBoundingClientRect().width ?? el.clientWidth / 3) + 24;
      const atEnd = el.scrollLeft >= max - 4;
      tweenScroll(el, atEnd ? 0 : Math.min(max, el.scrollLeft + step), atEnd ? 700 : 600);
    }, 4000);
    return () => {
      io.disconnect();
      window.clearInterval(id);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('pointerdown', stop);
      el.removeEventListener('wheel', stop);
      el.removeEventListener('touchstart', stop);
    };
  }, [featuredCarousel, reduced, featuredItems.length]);
  // Render the last-known hero instantly (cached from the previous visit); the
  // fresh settings replace it once loaded — same image → no swap for returning users.
  const cachedHero = useMemo(() => readHeroCache(), []);
  const hero = settings.data?.hero ?? cachedHero ?? undefined;
  // Known once we have any hero (fresh or cached) or the fetch settled (error → swirl fallback).
  const heroKnown = !!hero || !settings.isLoading;
  // Prefer an admin-uploaded Cloudinary hero; otherwise use the brand swirl.
  const heroPublicId = hero?.image;
  const useCloudHero = !!heroPublicId && /^https?:\/\//.test(cld(heroPublicId));

  // Refresh the cache whenever fresh settings arrive.
  useEffect(() => {
    const h = settings.data?.hero;
    if (!h) return;
    const cloud = /^https?:\/\//.test(cld(h.image));
    writeHeroCache({ ...h, imageUrl: cloud ? cld(h.image, { w: 1600 }) : undefined });
  }, [settings.data?.hero]);

  useEffect(() => {
    if (!useCloudHero || !heroPublicId) return;
    const href = cld(heroPublicId, { w: 1600 });
    // main.tsx may have already preloaded the cached hero — don't duplicate.
    if (document.querySelector(`link[rel="preload"][href="${CSS.escape(href)}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, [heroPublicId, useCloudHero]);

  const sec = settings.data?.homeSections;
  const show = (k: keyof NonNullable<typeof sec>) => (sec ? sec[k] : true);
  const order: ReorderableSection[] = settings.data?.sectionOrder ?? [...DEFAULT_SECTION_ORDER];

  const sectionMap: Record<ReorderableSection, ReactNode> = {
    samples: (
      <Reveal>
        <ThreeSteps />
      </Reveal>
    ),
    essence: (
      <Reveal>
        <section className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
          <ParallaxImage src="/essence.webp" alt="Herencia raw materials on gold silk" className="aspect-square rounded-2xl shadow-lux" />
          <div>
            <p className="eyebrow">The Essence of Heritage</p>
            <h2 className="display mt-3 text-3xl text-content md:text-4xl">
              Composed by hand. Matured for months. Bottled in small batches.
            </h2>
            <Link to="/products" className="btn-outline mt-6">Explore the notes</Link>
          </div>
        </section>
      </Reveal>
    ),
    featured: (
      <section>
        <Reveal>
          <div className="mb-10 text-center">
            <p className="eyebrow">The Collection</p>
            <h2 className="display mt-2 text-3xl text-content md:text-4xl">Featured scents</h2>
            <div className="rule-gold mx-auto mt-4 w-24" />
          </div>
        </Reveal>
        <div className="relative md:mx-auto md:max-w-4xl">
          <div
            ref={featuredScroller}
            // scroll-pl-5 is load-bearing, not cosmetic: with snap-mandatory the
            // browser snaps to the first card's edge and IGNORES this scroller's
            // padding, silently setting scrollLeft to 20px on load and pulling the
            // first card flush against the screen edge. scroll-padding makes the
            // snap point respect the gutter. It must be zeroed wherever px-5 is.
            className={`no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-pl-5 px-5 pb-3 sm:gap-5 ${
              featuredCarousel
                ? 'md:mx-0 md:snap-none md:gap-6 md:px-0 md:pb-0 md:scroll-pl-0'
                : 'sm:mx-0 sm:px-0 sm:scroll-pl-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0'
            }`}
          >
            {featured.isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-full"><Skeleton className="aspect-[5/6] rounded-xl" /></div>
                ))
              : featuredItems.map((p, i) => (
                  // Mount-based CSS reveal, NOT scroll-based: cards parked
                  // off-screen to the right of the carousel never intersect the
                  // viewport, so an IntersectionObserver reveal left them at
                  // opacity 0 forever.
                  <div
                    key={p.id}
                    className={`anim-fade-up w-[46%] shrink-0 snap-start sm:w-[31%] ${featuredCarousel ? 'md:w-[31.5%]' : 'md:w-full'}`}
                    style={{ animationDelay: `${Math.min(i, 2) * 100}ms` }}
                  >
                    <ProductCard product={p} />
                  </div>
                ))}
          </div>
          {featuredCarousel && (
            <>
              <button
                type="button"
                aria-label="Previous products"
                onClick={() => scrollFeatured(-1)}
                className="absolute -left-6 top-[38%] hidden h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface font-body text-content shadow-lux transition-colors hover:border-accent hover:text-accent md:flex lg:-left-14"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Next products"
                onClick={() => scrollFeatured(1)}
                className="absolute -right-6 top-[38%] hidden h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface font-body text-content shadow-lux transition-colors hover:border-accent hover:text-accent md:flex lg:-right-14"
              >
                →
              </button>
            </>
          )}
        </div>
        {!featured.isLoading && featuredItems.length === 0 && (
          <p className="text-center font-body text-muted">No featured products yet.</p>
        )}
        <Reveal delay={0.25}>
          <div className="mt-10 text-center"><Link to="/products" className="btn-outline">View all perfumes</Link></div>
        </Reveal>
      </section>
    ),
    gifting: (
      <Reveal>
        <section className="relative overflow-hidden rounded-2xl shadow-lux">
          <ParallaxImage src="/giftbox.webp" alt="Herencia maroon gift box" className="h-[360px] w-full md:h-[460px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-espresso/90 via-espresso/55 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-md px-7 md:px-12">
              <h2 className="display text-3xl text-cream md:text-4xl">The art of gifting</h2>
              <Link to="/bundles" className="btn-lux mt-6">Shop bundles</Link>
            </div>
          </div>
        </section>
      </Reveal>
    ),
    time: (
      // Full-bleed band (breaks out of the max-w container).
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
        <section className="relative overflow-hidden">
          <ParallaxImage src="/time.webp" alt="An hourglass in the atelier" className="h-[420px] w-full md:h-[520px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-espresso/95 via-espresso/70 to-espresso/20" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
              <div className="max-w-lg">
                <p className="eyebrow text-gold-hi">Time as an Ingredient</p>
                <h2 className="display mt-3 text-3xl text-cream sm:text-4xl md:text-5xl">Patience is our rarest material</h2>
                <p className="mt-4 max-w-md font-body leading-relaxed text-cream/80">
                  Months of resting allow the composition to breathe, mature, and find its perfect harmony before bottling.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    ),
    testimonials: (
      <Reveal>
        <section>
          <div className="mb-10 text-center">
            <p className="eyebrow">In their words</p>
            <h2 className="display mt-2 text-3xl text-content md:text-4xl">Loved by our patrons</h2>
            <div className="rule-gold mx-auto mt-4 w-24" />
          </div>
          <TestimonialCarousel />
        </section>
      </Reveal>
    ),
    values: (
      // Compact 2×2 on mobile (fits one glance, no scrolling); roomier 4-up on lg.
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 border-y border-hairline py-7 lg:grid-cols-4 lg:gap-6 lg:py-10">
        {([
          ['batch', 'Small-batch', 'Composed in limited runs'],
          ['cod', 'Cash on delivery', 'Pay when it arrives'],
          ['ship', 'Free shipping', 'On orders over 2,000 EGP'],
          ['returns', '14-day returns', 'Unopened items, full refund'],
        ] as const).map(([icon, title, sub], i) => (
          <Reveal key={title} delay={i * 0.07} className="flex flex-col items-center gap-2 text-center lg:flex-row lg:gap-3 lg:text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent lg:h-11 lg:w-11">
              {VALUE_ICONS[icon]}
            </span>
            <div>
              <p className="font-display text-sm text-content lg:text-base">{title}</p>
              <p className="mt-0.5 font-body text-xs text-muted lg:text-sm">{sub}</p>
            </div>
          </Reveal>
        ))}
      </div>
    ),
    quiz: (
      <Reveal>
        <section className="relative overflow-hidden rounded-2xl bg-espresso shadow-lux">
          <div className="grid md:grid-cols-[1.05fr_1fr]">
            {/* Copy — the consultation invitation */}
            <div className="relative z-10 px-7 py-14 md:px-12 md:py-20">
              {/* Gold dust drifts on the copy side only */}
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {SPARKLES.filter((s) => parseFloat(s.left) < 50).map((s, i) => (
                  <span key={i} className="sparkle" style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }} />
                ))}
              </div>
              <p className="eyebrow text-gold-hi">The Scent Consultation</p>
              <h2 className="display mt-3 max-w-md text-3xl text-cream md:text-4xl">
                Which scent were you born to wear?
              </h2>
              <p className="mt-4 max-w-sm font-body leading-relaxed text-cream/70">
                Answer a few questions and we&rsquo;ll name your scent family — and the bottle to begin with.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/find-your-scent"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 font-body text-sm font-medium tracking-wide text-espresso transition-colors hover:bg-gold-hi motion-safe:active:scale-[0.98]"
                >
                  Begin the consultation <span aria-hidden="true">→</span>
                </Link>
                <span className="font-body text-xs tracking-wide text-cream/50">Under a minute · no account needed</span>
              </div>
            </div>

            {/* Imagery — the atelier, with the four families drifting over it */}
            <div className="relative min-h-[280px] md:min-h-0">
              <ParallaxImage src="/apothecary.webp" alt="The Herencia apothecary wall" className="absolute inset-0" />
              <div className="absolute inset-0 bg-gradient-to-r from-espresso via-espresso/35 to-espresso/10 max-md:bg-gradient-to-b" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {([
                  ['Woody', '14%', '52%', '0s'],
                  ['Floral', '34%', '20%', '1.8s'],
                  ['Amber', '58%', '58%', '3.6s'],
                  ['Fresh', '76%', '26%', '5.4s'],
                ] as const).map(([name, top, left, delay]) => (
                  <span
                    key={name}
                    className="quiz-chip absolute inline-flex items-center gap-2 rounded-full border border-gold-hi/40 bg-espresso/75 px-3.5 py-1.5"
                    style={{ top, left, animationDelay: delay }}
                  >
                    <span className="text-[10px] leading-none text-gold-hi">✦</span>
                    <span className="font-body text-xs tracking-wide text-cream/85">{name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
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
    <div className="overflow-x-clip">
      {/* Full-bleed hero */}
      {show('hero') && (
        <section className="relative overflow-hidden bg-espresso">
          {/* Cached hero renders instantly; a true first visit briefly holds the espresso
              base until settings resolve (never flashes the wrong image). No CLS. */}
          {!heroKnown ? (
            <div className="h-[60vh] max-h-[760px] min-h-[380px] w-full sm:h-[72vh] sm:min-h-[440px]" />
          ) : useCloudHero && heroPublicId ? (
            <>
              {/* Blurred preview (~1–2 kB, preloaded from the baked HTML) paints
                  instantly while the sharp image downloads. Stays mounted so the
                  sharp image fades in over it, never over the dark base. */}
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ backgroundImage: `url(${cldBlur(heroPublicId)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
              {/* Plain <img> with the EXACT preloaded URL (heroCache/main.tsx preload
                  w=1600) — a srcset would pick a different width and waste the preload.
                  Slight scale gives the scroll parallax drift room without exposing edges. */}
              <motion.img
                ref={heroImgRef}
                src={cld(heroPublicId, { w: 1600 })}
                alt={hero?.title ?? 'HERENCIA'}
                decoding="async"
                onLoad={() => setHeroLoaded(true)}
                {...({ fetchpriority: 'high' } as object)}
                style={{ y: heroImgY, scale: reduced ? 1 : 1.1 }}
                className={`h-[60vh] max-h-[760px] min-h-[380px] w-full sm:h-[72vh] sm:min-h-[440px] object-cover transition-opacity duration-300 ease-out ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            </>
          ) : (
            <motion.img
              ref={heroImgRef}
              src="/hero-swirl.webp"
              alt={hero?.title ?? 'HERENCIA'}
              onLoad={() => setHeroLoaded(true)}
              style={{ y: heroImgY, scale: reduced ? 1 : 1.1 }}
              className={`h-[60vh] max-h-[760px] min-h-[380px] w-full sm:h-[72vh] sm:min-h-[440px] bg-espresso object-cover transition-opacity duration-300 ease-out ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
          {/* Between the image and the scrims: the image keeps painting first and
              stays the fallback, the video only layers over it once ready. */}
          {hero?.video && <HeroVideo src={hero.video} ready={heroLoaded} />}
          <div className="absolute inset-0 bg-gradient-to-t from-espresso/90 via-espresso/45 to-espresso/15" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-espresso/55 to-transparent" />
          <ScentTrail />
          {/* pt-16 on mobile clears the overlaid header: the hero is shorter there,
              so vertically centred copy would otherwise ride up under the logo. */}
          {heroKnown && (
            <div className="absolute inset-0 flex items-center pt-16 sm:pt-0">
              <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
                <motion.div style={{ y: heroTextY, opacity: heroTextOpacity }} className="max-w-2xl space-y-6">
                  <p className="eyebrow rise text-gold-hi" style={{ animationDelay: '0.05s' }}>Heritage Perfumery</p>
                  <h1 className="display text-5xl leading-[1.02] text-cream sm:text-6xl md:text-7xl">
                    <WordReveal text={hero?.title ?? 'Luxury in every drop'} delay={150} step={95} />
                  </h1>
                  <p className="rise max-w-md font-body text-base leading-relaxed text-cream/85 md:text-lg" style={{ animationDelay: '0.28s' }}>{hero?.subtitle ?? 'Composed in small batches, worn like an heirloom.'}</p>
                  <div className="rise flex flex-wrap gap-3 pt-2" style={{ animationDelay: '0.4s' }}>
                    <Link to={hero?.ctaLink ?? '/products'} className="btn-lux">{hero?.ctaText ?? 'Shop the collection'}</Link>
                    <Link to="/find-your-scent" className="btn-outline border-cream/40 text-cream hover:bg-cream hover:text-espresso">Find your scent</Link>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Contained content, in the admin-configured order */}
      <div className="mx-auto max-w-6xl space-y-20 px-5 py-16 sm:px-6 md:space-y-28 md:py-24">
        {order
          .filter((k) => show(k))
          .map((k) => <div key={k}>{sectionMap[k]}</div>)
          .flatMap((el, i) =>
          i === 0
            ? [el]
            : [
                <Reveal key={`div-${i}`}>
                  <div className="flex items-center justify-center gap-3" aria-hidden="true">
                    <span className="h-px w-10 bg-hairline" />
                    <span className="text-xs text-accent/60">✦</span>
                    <span className="h-px w-10 bg-hairline" />
                  </div>
                </Reveal>,
                el,
              ],
        )}
      </div>
    </div>
  );
}
