import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchScentFamilies } from '../lib/api';
import { readListCache, writeListCache } from '../lib/listCache';
import { useSeo } from '../lib/useSeo';
import { useProductFilters } from '../features/products/useProductFilters';
import { FilterBar } from '../features/products/FilterBar';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';

export default function Products() {
  useSeo({ title: 'Shop Perfumes — HERENCIA', description: 'Browse the HERENCIA perfume collection.' });
  const { filters, setFilter, reset, resetKey } = useProductFilters();
  const families = useQuery({ queryKey: ['scent-families'], queryFn: fetchScentFamilies });
  // The default (unfiltered) view renders instantly from the last visit's
  // cached list; filtered views fetch normally.
  const isDefaultView = Object.keys(filters).length === 0;
  const products = useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const data = await fetchProducts({ ...filters, type: 'perfume' });
      if (isDefaultView) writeListCache('shop', data);
      return data;
    },
    placeholderData: isDefaultView
      ? () => readListCache<import('@herencia/shared').ProductListDTO>('shop')
      : undefined,
  });

  const data = products.data;
  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow">The Collection</p>
        <h1 className="display mt-2 text-3xl text-content md:text-4xl">Perfumes</h1>
        <div className="rule-gold-left mt-4" />
      </div>
      <FilterBar key={resetKey} families={families.data ?? []} filters={filters} onChange={setFilter} onReset={reset} />

      {products.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[5/6] rounded-xl" />)}
        </div>
      ) : products.isError ? (
        <p className="font-body text-muted">Could not load products. Please try again.</p>
      ) : data && data.items.length === 0 ? (
        <p className="py-16 text-center font-body text-muted">No perfumes match your filters.</p>
      ) : (
        <>
          {/* Cards arrive one after another rather than as one block. Mount-based
              with a capped stagger, NOT a scroll-reveal per card: round 36 left
              carousel cards stranded at opacity 0 forever because they never
              intersected the viewport. This never consults scroll position, and
              the reduced-motion rule zeroes both duration and delay. */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
            {data?.items.map((p, i) => (
              <div
                key={p.id}
                className="anim-fade-up h-full"
                style={{ animationDelay: `${Math.min(i, 11) * 55}ms` }}
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
          {data && data.pages > 1 ? (
            <div className="mt-12 flex items-center justify-center gap-4 font-body">
              <button disabled={data.page <= 1} onClick={() => setFilter('page', data.page - 1)} className="rounded-md border border-line px-4 py-2 text-content transition-colors hover:border-accent disabled:opacity-40">Previous</button>
              <span className="text-sm text-muted">Page {data.page} of {data.pages}</span>
              <button disabled={data.page >= data.pages} onClick={() => setFilter('page', data.page + 1)} className="rounded-md border border-line px-4 py-2 text-content transition-colors hover:border-accent disabled:opacity-40">Next</button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
