import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from './CartContext';
import { Price } from '../../components/Price';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { DURATION, EASE_OUT } from '../../lib/motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export function CartDrawer() {
  const { priced, open, setOpen, updateQty, removeItem } = useCart();
  const trapRef = useFocusTrap(open);
  const reduced = useReducedMotion();
  const d = reduced ? 0 : DURATION.base;

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: d }}
          />

          {/* Drawer panel */}
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-label="Cart"
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-bg shadow-xl"
            initial={{ x: reduced ? 0 : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: reduced ? 0 : '100%' }}
            transition={{ duration: d, ease: EASE_OUT }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="font-display text-xl text-content">Your Cart</h2>
              <button
                type="button"
                aria-label="Close cart"
                onClick={() => setOpen(false)}
                className="font-body text-muted hover:text-content"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {priced && priced.hasUnavailable && (
                <p className="mb-4 rounded-md border border-line bg-maroon/10 px-4 py-2 font-body text-sm text-maroon">
                  Some items in your cart are unavailable or out of stock.
                </p>
              )}

              {!priced || priced.items.length === 0 ? (
                <p className="font-body text-muted">Your cart is empty.</p>
              ) : (
                <ul className="space-y-6">
                  {priced.items.map((line) => (
                    <li key={`${line.productId}-${line.sizeLabel}`} className="flex gap-4">
                      {line.image ? (
                        <img
                          src={line.image}
                          alt={line.name}
                          className="h-20 w-20 flex-shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-20 w-20 flex-shrink-0 rounded-md bg-line" />
                      )}
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-body text-sm font-medium text-content">{line.name}</p>
                            <p className="font-body text-xs text-muted">{line.sizeLabel}</p>
                            {!line.available && (
                              <p className="font-body text-xs text-maroon">Unavailable</p>
                            )}
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${line.name}`}
                            onClick={() => removeItem(line.productId, line.sizeLabel)}
                            className="font-body text-xs text-muted hover:text-content"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Qty stepper */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => updateQty(line.productId, line.sizeLabel, line.qty - 1)}
                              className="flex h-6 w-6 items-center justify-center rounded border border-line font-body text-sm text-content hover:bg-accent/10"
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-body text-sm text-content">{line.qty}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => updateQty(line.productId, line.sizeLabel, line.qty + 1)}
                              disabled={line.qty >= line.maxQty}
                              className="flex h-6 w-6 items-center justify-center rounded border border-line font-body text-sm text-content hover:bg-accent/10 disabled:opacity-50"
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
              )}
            </div>

            {/* Footer totals + checkout */}
            {priced && priced.items.length > 0 && (
              <div className="border-t border-line px-6 py-4 space-y-2">
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
                  onClick={() => setOpen(false)}
                  className="mt-3 block w-full rounded-md bg-maroon px-4 py-3 text-center font-body text-sm text-cream transition-colors hover:bg-maroon/90"
                >
                  Checkout
                </Link>
                <Link
                  to="/cart"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center font-body text-sm text-muted hover:text-content"
                >
                  View cart
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
