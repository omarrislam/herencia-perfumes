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
        className="card-lux block overflow-hidden rounded-xl focus-visible:outline-none"
      >
        <div className="aspect-[4/5] overflow-hidden bg-surface2">
          <ProductImage publicId={product.images[0] ?? ''} alt={product.name} w={500} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transform-none motion-reduce:transition-none" />
        </div>
        <div className="p-5">
          {product.scentFamily?.name && <p className="eyebrow mb-1.5">{product.scentFamily.name}</p>}
          <h3 className="font-display text-lg leading-snug text-content">{product.name}</h3>
          <div className="mt-1.5"><Rating avg={product.rating.avg} count={product.rating.count} /></div>
          <div className="mt-3"><Price value={product.basePrice} compareAt={baseSize?.compareAtPrice} /></div>
        </div>
      </Link>
      <div className="absolute right-3 top-3 z-10">
        <WishlistButton productId={product.id} />
      </div>
    </div>
  );
}
