import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchProducts, fetchSettings } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { Skeleton } from '../components/Skeleton';
import { BannerStrip } from '../components/BannerStrip';

export default function Home() {
  useSeo({ title: 'HERENCIA — Luxury in every drop', description: 'Heritage luxury perfumery.' });
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const featured = useQuery({ queryKey: ['products', 'featured'], queryFn: () => fetchProducts({ sort: 'rating', page: 1 }) });
  const featuredItems = (featured.data?.items ?? []).filter((p) => p.isFeatured).slice(0, 4);
  const hero = settings.data?.hero;

  return (
    <div className="space-y-12">
      <BannerStrip placement="home_hero" />

      <section className="relative overflow-hidden rounded-xl border border-line bg-surface">
        {hero ? (
          <ProductImage publicId={hero.image} alt={hero.title} w={1200} loading="eager" className="h-72 w-full object-cover opacity-60" />
        ) : (
          <Skeleton className="h-72 w-full" />
        )}
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="space-y-4">
            <h1 className="font-display text-4xl text-content md:text-5xl">{hero?.title ?? 'Luxury in every drop'}</h1>
            <p className="mx-auto max-w-xl font-body text-muted">{hero?.subtitle ?? ''}</p>
            <Link to={hero?.ctaLink ?? '/products'} className="inline-block rounded-md bg-maroon px-6 py-3 font-body text-cream hover:bg-maroon/90">
              {hero?.ctaText ?? 'Shop the collection'}
            </Link>
          </div>
        </div>
      </section>

      <BannerStrip placement="home_strip" />

      <section>
        <h2 className="mb-4 font-display text-2xl text-content">Featured</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)
            : featuredItems.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        {!featured.isLoading && featuredItems.length === 0 && (
          <p className="font-body text-muted">No featured products yet.</p>
        )}
      </section>
    </div>
  );
}
