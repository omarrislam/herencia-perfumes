import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { SAMPLE_PRODUCT } from '@herencia/shared';
import { useSamples } from './SampleContext';
import { fetchProducts, fetchProduct } from '../../lib/api';
import { useCart } from '../cart/CartContext';
import { ProductImage } from '../../components/ProductImage';
import { formatEGP } from '../../components/Price';

export function SampleModal() {
  const { isOpen, close, samples, add, remove, has, clear } = useSamples();
  const { items, addItem, updateQty, setOpen } = useCart();
  const products = useQuery({ queryKey: ['products', 'sample-pick'], queryFn: () => fetchProducts({ limit: 24 }), enabled: isOpen });
  const sampleProduct = useQuery({ queryKey: ['product', SAMPLE_PRODUCT.slug], queryFn: () => fetchProduct(SAMPLE_PRODUCT.slug), enabled: isOpen, retry: false });

  const pool = (products.data?.items ?? []).filter((p) => p.type === 'perfume');
  // The sample's size (label + price) is whatever the admin set in Products.
  const size = sampleProduct.data?.sizes[0];
  const sizeLabel = size?.label ?? SAMPLE_PRODUCT.sizeLabel;
  const unitPrice = size?.price ?? SAMPLE_PRODUCT.price;
  const canAdd = samples.length > 0 && !!sampleProduct.data;

  const addSamplesToCart = () => {
    if (!sampleProduct.data || samples.length === 0) return;
    // One cart line for the sample product; qty = number of picked samples.
    const id = sampleProduct.data.id;
    const line = items.find((i) => i.productId === id && i.sizeLabel === sizeLabel);
    if (line) updateQty(id, sizeLabel, samples.length);
    else addItem({ productId: id, sizeLabel, qty: samples.length });
    close();
    setOpen(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-espresso/70 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={close}
        >
          <motion.div
            initial={{ y: 40, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Order samples"
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-bg shadow-lux sm:rounded-2xl"
          >
            {/* header */}
            <div className="flex items-start justify-between gap-4 border-b border-hairline p-6">
              <div>
                <p className="eyebrow">Try before you commit</p>
                <h2 className="display mt-1 text-2xl text-content">Order samples</h2>
                <p className="mt-1 font-body text-sm text-muted">
                  Pick as many as you like · {sizeLabel} each · {formatEGP(unitPrice)} per sample. The value is credited when you buy the bottle.
                </p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-content hover:border-accent hover:text-accent">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* selected */}
              <div className="mb-5 flex items-center justify-between">
                <p className="font-body text-sm text-content">
                  <span className="font-medium text-success">{samples.length}</span> selected
                </p>
                {samples.length > 0 && <button type="button" onClick={clear} className="font-body text-xs text-muted hover:text-accent">Clear all</button>}
              </div>

              {/* pool */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {pool.map((p) => {
                  const selected = has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => (selected ? remove(p.id) : add({ id: p.id, name: p.name, slug: p.slug, image: p.images[0] ?? '' }))}
                      className={`group relative flex items-center gap-3 rounded-lg border p-2 text-left transition-colors disabled:opacity-40 ${
                        selected ? 'border-success bg-success-soft' : 'border-hairline hover:border-accent'
                      }`}
                    >
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface2">
                        <ProductImage publicId={p.images[0] ?? ''} alt="" w={100} className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-sm text-content">{p.name}</span>
                        <span className={`font-body text-xs ${selected ? 'font-medium text-success' : 'text-muted'}`}>
                          {selected ? 'Selected' : formatEGP(unitPrice)}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-semibold transition-colors ${
                          selected
                            ? 'bg-success text-white'
                            : 'border-2 border-accent bg-accent/10 text-accent group-hover:bg-accent group-hover:text-cream'
                        }`}
                      >
                        {selected ? '✓' : '+'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* footer */}
            <div className="flex items-center justify-between gap-4 border-t border-hairline p-4">
              <span className="font-body text-sm text-muted">
                {samples.length > 0 ? (
                  <>
                    {samples.length} sample{samples.length === 1 ? '' : 's'} ·{' '}
                    <span className="font-medium text-content">{formatEGP(unitPrice * samples.length)}</span>
                  </>
                ) : (
                  <>From {formatEGP(unitPrice)} per sample</>
                )}
              </span>
              <button
                type="button"
                onClick={addSamplesToCart}
                disabled={!canAdd}
                className={`rounded-md px-5 py-3 font-body text-sm font-medium tracking-wide transition-colors ${canAdd ? 'bg-cta text-cream hover:bg-cta-hover' : 'cursor-not-allowed bg-surface2 text-muted'}`}
              >
                {samples.length === 0 ? 'Pick at least one' : `Add ${samples.length} to cart`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
