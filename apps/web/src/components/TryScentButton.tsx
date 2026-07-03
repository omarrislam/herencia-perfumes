import type { ProductDTO } from '@herencia/shared';
import { useSamples } from '../features/samples/SampleContext';

export function TryScentButton({ product, className }: { product: ProductDTO; className?: string }) {
  const { open } = useSamples();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        open({ id: product.id, name: product.name, slug: product.slug, image: product.images[0] ?? '' });
      }}
      className={
        className ??
        'w-full rounded-md border border-hairline py-2 font-body text-xs font-medium tracking-wide text-content transition-colors hover:border-accent hover:text-accent'
      }
    >
      Try scent
    </button>
  );
}
