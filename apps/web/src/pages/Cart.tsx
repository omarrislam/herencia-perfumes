import { Link } from 'react-router-dom';
import { useCart } from '../features/cart/CartContext';
import { Price } from '../components/Price';
import { cld } from '../lib/cloudinary';

export default function Cart() {
  const { priced, updateQty, removeItem } = useCart();

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <h1 className="font-display text-3xl text-content">Your Cart</h1>

      {priced && priced.hasUnavailable && (
        <p className="rounded-md border border-line bg-maroon/10 px-4 py-2 font-body text-sm text-maroon">
          Some items are unavailable or out of stock.
        </p>
      )}

      {!priced || priced.items.length === 0 ? (
        <div className="space-y-4">
          <p className="font-body text-muted">Your cart is empty.</p>
          <Link to="/products" className="font-body text-sm text-accent hover:underline">
            Browse perfumes
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-6">
            {priced.items.map((line) => (
              <li
                key={`${line.productId}-${line.sizeLabel}`}
                className="flex gap-4 border-b border-line pb-6"
              >
                {line.image ? (
                  <img
                    src={cld(line.image, { w: 192 })}
                    alt={line.name}
                    className="h-24 w-24 flex-shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 flex-shrink-0 rounded-md bg-line" />
                )}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-body font-medium text-content">{line.name}</p>
                      <p className="font-body text-sm text-muted">{line.sizeLabel}</p>
                      {!line.available && (
                        <p className="font-body text-xs text-maroon">Unavailable</p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => removeItem(line.productId, line.sizeLabel)}
                      className="font-body text-sm text-muted hover:text-content"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => updateQty(line.productId, line.sizeLabel, line.qty - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded border border-line font-body text-sm text-content hover:bg-gold/10"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-body text-content">{line.qty}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => updateQty(line.productId, line.sizeLabel, line.qty + 1)}
                        disabled={line.qty >= line.maxQty}
                        className="flex h-8 w-8 items-center justify-center rounded border border-line font-body text-sm text-content hover:bg-gold/10 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                    <Price value={line.lineTotal} />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-2 rounded-md border border-line px-6 py-4">
            <div className="flex justify-between font-body text-sm text-muted">
              <span>Subtotal</span>
              <Price value={priced.subtotal} />
            </div>
            <div className="flex justify-between font-body text-sm text-muted">
              <span>Shipping</span>
              {priced.shipping === 0 ? (
                <span className="text-accent">Free</span>
              ) : (
                <Price value={priced.shipping} />
              )}
            </div>
            <div className="flex justify-between font-body text-base font-medium text-content">
              <span>Total</span>
              <Price value={priced.total} />
            </div>
            <Link
              to="/checkout"
              className="mt-4 block w-full rounded-md bg-maroon px-4 py-3 text-center font-body text-sm text-cream transition-colors hover:bg-maroon/90"
            >
              Checkout
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
