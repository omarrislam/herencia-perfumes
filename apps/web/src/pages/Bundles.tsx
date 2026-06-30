import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';

export default function Bundles() {
  useSeo({ title: 'Bundles — HERENCIA', description: 'Curated HERENCIA perfume bundles.' });
  const bundles = useQuery({ queryKey: ['products', { type: 'bundle' }], queryFn: () => fetchProducts({ type: 'bundle' }) });

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-content">Bundles</h1>
      {bundles.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      ) : bundles.data && bundles.data.items.length === 0 ? (
        <p className="font-body text-muted">No bundles available yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {bundles.data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
