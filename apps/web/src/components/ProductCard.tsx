import { Link } from 'react-router-dom';
import { type ProductDTO, soleSizeLabel } from '@herencia/shared';
import { ProductImage } from './ProductImage';
import { Price } from './Price';
import { Rating } from './Rating';
import { WishlistButton } from './WishlistButton';
import { TryScentButton } from './TryScentButton';
import { useCart } from '../features/cart/CartContext';

export function ProductCard({ product }: { product: ProductDTO }) {
  const { addItem, setOpen } = useCart();
  const href = `${product.type === 'bundle' ? '/bundles' : '/products'}/${product.slug}`;
  const baseSize = product.sizes.reduce<(typeof product.sizes)[number] | undefined>(
    (min, s) => (min === undefined || s.price < min.price ? s : min),
    undefined,
  );
  const inStock = product.sizes.some((s) => s.stock > 0);
  // Only stated when unambiguous — with several sizes the card shows a "from" price instead.
  const soleSize = soleSizeLabel(product);
  const showConcentration = product.type === 'perfume' && product.concentration && product.concentration !== 'Other';

  const addToCart = () => {
    if (!baseSize) return;
    addItem({ productId: product.id, sizeLabel: baseSize.label, qty: 1 });
    setOpen(true);
  };

  return (
    <div className="group card-lux relative flex h-full flex-col overflow-hidden rounded-xl">
      <Link to={href} className="block focus-visible:outline-none">
        <div className="relative aspect-[5/4] overflow-hidden bg-surface2">
          <ProductImage
            publicId={product.images[0] ?? ''}
            alt={product.name}
            w={500}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transform-none motion-reduce:transition-none"
          />
          {showConcentration && (
            <span className="absolute left-3 top-3 rounded-full bg-espresso/85 px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-wider text-cream">
              {product.concentration}
            </span>
          )}
        </div>
        <div className="p-3.5 pb-1.5">
          <h3 className="font-display text-base leading-snug text-content">{product.name}</h3>
          {soleSize && <p className="mt-0.5 font-body text-xs tracking-wide text-muted">{soleSize}</p>}
          <div className="mt-0.5"><Rating avg={product.rating.avg} count={product.rating.count} /></div>
        </div>
      </Link>
      <div className="mt-auto flex flex-col gap-2 px-3.5 pb-3.5">
        <Price value={product.basePrice} compareAt={baseSize?.compareAtPrice} />
        <button
          type="button"
          onClick={addToCart}
          disabled={!inStock}
          aria-label={`Add ${product.name} to cart`}
          className="w-full whitespace-nowrap rounded-md bg-cta py-2 font-body text-xs font-medium tracking-wide text-cream transition-colors hover:bg-cta-hover disabled:opacity-50"
        >
          {inStock ? 'Add to cart' : 'Sold out'}
        </button>
        {product.type === 'perfume' && product.sampleStock > 0 && <TryScentButton product={product} />}
      </div>
      <div className="absolute right-3 top-3 z-10">
        <WishlistButton productId={product.id} />
      </div>
    </div>
  );
}
