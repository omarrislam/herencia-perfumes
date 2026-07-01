import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchScentFamilies } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { useProductFilters } from '../features/products/useProductFilters';
import { FilterBar } from '../features/products/FilterBar';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';
import { Reveal } from '../components/Reveal';

export default function Products() {
  useSeo({ title: 'Shop Perfumes — HERENCIA', description: 'Browse the HERENCIA perfume collection.' });
  const { filters, setFilter, reset, resetKey } = useProductFilters();
  const families = useQuery({ queryKey: ['scent-families'], queryFn: fetchScentFamilies });
  const products = useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts({ ...filters, type: 'perfume' }),
  });

  const data = products.data;
  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-content">Perfumes</h1>
      <FilterBar key={resetKey} families={families.data ?? []} filters={filters} onChange={setFilter} onReset={reset} />

      {products.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      ) : products.isError ? (
        <p className="font-body text-muted">Could not load products. Please try again.</p>
      ) : data && data.items.length === 0 ? (
        <p className="font-body text-muted">No perfumes match your filters.</p>
      ) : (
        <>
          <Reveal>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </Reveal>
          {data && data.pages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-4 font-body">
              <button disabled={data.page <= 1} onClick={() => setFilter('page', data.page - 1)} className="rounded-md border border-line px-4 py-2 text-content disabled:opacity-40">Previous</button>
              <span className="text-muted">Page {data.page} of {data.pages}</span>
              <button disabled={data.page >= data.pages} onClick={() => setFilter('page', data.page + 1)} className="rounded-md border border-line px-4 py-2 text-content disabled:opacity-40">Next</button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
