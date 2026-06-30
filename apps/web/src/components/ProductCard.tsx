import { Link } from 'react-router-dom';
import type { ProductDTO } from '@herencia/shared';
import { ProductImage } from './ProductImage';
import { Price } from './Price';
import { Rating } from './Rating';
import { WishlistButton } from './WishlistButton';

export function ProductCard({ product }: { product: ProductDTO }) {
  const href = `${product.type === 'bundle' ? '/bundles' : '/products'}/${product.slug}`;
  const baseSize = product.sizes.reduce<typeof product.sizes[number] | undefined>(
    (min, s) => (min === undefined || s.price < min.price ? s : min),
    undefined,
  );
  return (
    <div className="group relative">
      <Link
        to={href}
        className="block rounded-lg border border-line bg-surface p-3 transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <div className="aspect-square overflow-hidden rounded-md bg-bg">
          <ProductImage publicId={product.images[0] ?? ''} alt={product.name} w={400} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        </div>
        <h3 className="mt-3 font-display text-lg text-content">{product.name}</h3>
        <p className="font-body text-sm text-muted">{product.scentFamily?.name ?? ''}</p>
        <div className="mt-1"><Rating avg={product.rating.avg} count={product.rating.count} /></div>
        <div className="mt-2"><Price value={product.basePrice} compareAt={baseSize?.compareAtPrice} /></div>
      </Link>
      <div className="absolute right-2 top-2 z-10">
        <WishlistButton productId={product.id} />
      </div>
    </div>
  );
}
