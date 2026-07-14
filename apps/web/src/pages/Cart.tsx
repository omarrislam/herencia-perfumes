import { Link } from 'react-router-dom';
import { SAMPLE_SIZE_LABEL, DEFAULT_SAMPLES_SETTINGS } from '@herencia/shared';
import { useCart } from '../features/cart/CartContext';
import { Price } from '../components/Price';
import { cld } from '../lib/cloudinary';
import { useSeo } from '../lib/useSeo';

export default function Cart() {
  useSeo({ title: 'Your Cart — HERENCIA' });
  const { priced, updateQty, removeItem } = useCart();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="eyebrow">Your selection</p>
        <h1 className="display mt-2 text-3xl text-content">Your Cart</h1>
        <div className="rule-gold-left mt-4" />
      </div>

      {priced && priced.hasUnavailable && (
        <p className="rounded-md border border-hairline bg-danger-soft px-4 py-2 font-body text-sm text-danger">
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
                      <p className="font-body text-sm text-muted">
                        {line.sizeLabel === SAMPLE_SIZE_LABEL ? `Sample · ${DEFAULT_SAMPLES_SETTINGS.sizeLabel}` : line.sizeLabel}
                      </p>
                      {!line.available && (
                        <p className="font-body text-xs text-danger">Unavailable</p>
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
                        className="flex h-8 w-8 items-center justify-center rounded border border-line font-body text-sm text-content hover:bg-accent/10"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-body text-content">{line.qty}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => updateQty(line.productId, line.sizeLabel, line.qty + 1)}
                        disabled={line.qty >= line.maxQty}
                        className="flex h-8 w-8 items-center justify-center rounded border border-line font-body text-sm text-content hover:bg-accent/10 disabled:opacity-50"
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

          <div className="card-lux space-y-3 rounded-xl px-6 py-5">
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
            <div className="rule-gold" />
            <div className="flex justify-between font-body text-lg font-medium text-content">
              <span>Total</span>
              <Price value={priced.total} />
            </div>
            {priced.hasUnavailable ? (
              <div className="mt-2 space-y-1.5">
                <button type="button" disabled className="btn-lux w-full cursor-not-allowed opacity-50">
                  Proceed to checkout
                </button>
                <p className="text-center font-body text-xs text-danger">Remove the unavailable items to continue.</p>
              </div>
            ) : (
              <Link to="/checkout" className="btn-lux mt-2 w-full">
                Proceed to checkout
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
