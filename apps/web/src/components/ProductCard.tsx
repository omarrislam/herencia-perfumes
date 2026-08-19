import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { type ProductDTO, soleSizeLabel } from '@herencia/shared';
import { ProductImage } from './ProductImage';
import { Price } from './Price';
import { Rating } from './Rating';
import { WishlistButton } from './WishlistButton';
import { TryScentButton } from './TryScentButton';
import { useCart } from '../features/cart/CartContext';
import { track } from '../lib/analytics';
import { flyToCart } from '../lib/flyToCart';

export function ProductCard({ product }: { product: ProductDTO }) {
  const { addItem, setOpen } = useCart();
  const imgRef = useRef<HTMLDivElement>(null);
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
    track('add_to_cart', { productSlug: product.slug });
    // Answers "where did that go?" at the moment of commitment.
    flyToCart(imgRef.current?.querySelector('img'));
    setOpen(true);
  };

  return (
    // Deliberately NOT a bordered box. A card outline around every product is the
    // detail that dates a storefront; letting the photograph be the card is what
    // modern fragrance sites do. Chrome lives on the image, not around it.
    <div className="group relative flex h-full flex-col">
      {/* One link per card: the image and the title are a single target, which is
          both simpler for keyboard users and what the card tests assert. */}
      <Link to={href} className="block focus-visible:outline-none">
        <div
          ref={imgRef}
          className="card-sweep relative aspect-[3/4] overflow-hidden rounded-xl bg-surface2"
        >
          <ProductImage
            publicId={product.images[0] ?? ''}
            alt={product.name}
            w={600}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none"
          />
          {showConcentration && (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-espresso/80 px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-wider text-cream backdrop-blur-sm">
              {product.concentration}
            </span>
          )}
          {!inStock && (
            <span className="absolute inset-x-0 bottom-0 bg-espresso/75 py-1.5 text-center font-body text-[11px] uppercase tracking-wider text-cream">
              Sold out
            </span>
          )}
        </div>
        <div className="mt-3">
          <h3 className="font-display text-[15px] leading-snug text-content">{product.name}</h3>
          {soleSize && (
            <p className="mt-0.5 font-body text-xs tracking-wide text-muted">{soleSize}</p>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="mt-0.5"><Rating avg={product.rating.avg} count={product.rating.count} /></div>
        <div className="mt-1.5 font-body">
          <Price value={product.basePrice} compareAt={baseSize?.compareAtPrice} />
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-3">
          <button
            type="button"
            onClick={addToCart}
            disabled={!inStock}
            aria-label={`Add ${product.name} to cart`}
            className="w-full whitespace-nowrap rounded-lg bg-cta py-2.5 font-body text-xs font-medium tracking-wide text-cream transition-colors hover:bg-cta-hover disabled:opacity-50"
          >
            {inStock ? 'Add to cart' : 'Sold out'}
          </button>
          {product.type === 'perfume' && product.sampleStock > 0 && <TryScentButton product={product} />}
        </div>
      </div>

      <div className="absolute right-2.5 top-2.5 z-10">
        <WishlistButton productId={product.id} />
      </div>
    </div>
  );
}
