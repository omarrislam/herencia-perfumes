import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';
import { Reveal } from '../components/Reveal';

export default function Bundles() {
  useSeo({ title: 'Bundles — HERENCIA', description: 'Curated HERENCIA perfume bundles.' });
  const bundles = useQuery({ queryKey: ['products', { type: 'bundle' }], queryFn: () => fetchProducts({ type: 'bundle' }) });

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow">Curated Sets</p>
        <h1 className="display mt-2 text-3xl text-content md:text-4xl">Bundles</h1>
        <div className="rule-gold-left mt-4" />
      </div>
      {bundles.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      ) : bundles.data && bundles.data.items.length === 0 ? (
        <p className="py-16 text-center font-body text-muted">No bundles available yet.</p>
      ) : (
        <Reveal>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
            {bundles.data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </Reveal>
      )}
    </div>
  );
}
