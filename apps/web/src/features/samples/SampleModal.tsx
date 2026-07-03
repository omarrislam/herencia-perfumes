import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { SAMPLE_BOX } from '@herencia/shared';
import { useSamples } from './SampleContext';
import { fetchProducts, fetchProduct } from '../../lib/api';
import { useCart } from '../cart/CartContext';
import { ProductImage } from '../../components/ProductImage';
import { formatEGP } from '../../components/Price';

export function SampleModal() {
  const { isOpen, close, samples, add, remove, has, max, clear } = useSamples();
  const { addItem, setOpen } = useCart();
  const products = useQuery({ queryKey: ['products', 'sample-pick'], queryFn: () => fetchProducts({ limit: 24 }), enabled: isOpen });
  const box = useQuery({ queryKey: ['product', SAMPLE_BOX.slug], queryFn: () => fetchProduct(SAMPLE_BOX.slug), enabled: isOpen, retry: false });

  const pool = (products.data?.items ?? []).filter((p) => p.type === 'perfume');
  const full = samples.length >= max;
  const canAdd = samples.length > 0 && !!box.data;

  const addBoxToCart = () => {
    if (!box.data || samples.length === 0) return;
    addItem({ productId: box.data.id, sizeLabel: SAMPLE_BOX.sizeLabel, qty: 1 });
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
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-bg shadow-lux sm:rounded-2xl"
          >
            {/* header */}
            <div className="flex items-start justify-between gap-4 border-b border-hairline p-6">
              <div>
                <p className="eyebrow">Try before you commit</p>
                <h2 className="display mt-1 text-2xl text-content">Build your sample box</h2>
                <p className="mt-1 font-body text-sm text-muted">Pick up to {max} · 2ml each. The full box value is credited when you buy.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-content hover:border-accent hover:text-accent">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* selected */}
              <div className="mb-5 flex items-center justify-between">
                <p className="font-body text-sm text-content">
                  <span className="font-medium text-accent">{samples.length}</span> of {max} selected
                </p>
                {samples.length > 0 && <button type="button" onClick={clear} className="font-body text-xs text-muted hover:text-accent">Clear all</button>}
              </div>
              {samples.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {samples.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 py-1 pl-1 pr-2.5 font-body text-xs text-content">
                      <span className="h-6 w-6 overflow-hidden rounded-full"><ProductImage publicId={s.image} alt="" w={60} className="h-full w-full object-cover" /></span>
                      {s.name}
                      <button type="button" onClick={() => remove(s.id)} aria-label={`Remove ${s.name}`} className="text-muted hover:text-danger">✕</button>
                    </span>
                  ))}
                </div>
              )}

              {/* pool */}
              <p className="eyebrow mb-3">Add fragrances</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {pool.map((p) => {
                  const selected = has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!selected && full}
                      onClick={() => (selected ? remove(p.id) : add({ id: p.id, name: p.name, slug: p.slug, image: p.images[0] ?? '' }))}
                      className={`group flex items-center gap-3 rounded-lg border p-2 text-left transition-colors disabled:opacity-40 ${selected ? 'border-accent bg-accent/10' : 'border-hairline hover:border-accent'}`}
                    >
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface2"><ProductImage publicId={p.images[0] ?? ''} alt="" w={100} className="h-full w-full object-cover" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-sm text-content">{p.name}</span>
                        <span className="font-body text-xs text-muted">{selected ? 'Added ✓' : 'Add +'}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* footer */}
            <div className="flex items-center justify-between gap-4 border-t border-hairline p-4">
              <span className="font-body text-sm text-muted">Sample box · <span className="text-content">{formatEGP(SAMPLE_BOX.price)}</span></span>
              <button
                type="button"
                onClick={addBoxToCart}
                disabled={!canAdd}
                className={`rounded-md px-5 py-3 font-body text-sm font-medium tracking-wide transition-colors ${canAdd ? 'bg-espresso text-cream hover:bg-accent-strong' : 'cursor-not-allowed bg-surface2 text-muted'}`}
              >
                {samples.length === 0 ? 'Pick at least one' : 'Add sample box to cart'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
