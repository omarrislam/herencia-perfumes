import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GENDER, CONCENTRATION, PRODUCT_SORT, type ScentFamilyDTO } from '@herencia/shared';
import type { ProductFilters } from '../../lib/api';

export function FilterBar({
  families, filters, onChange, onReset,
}: {
  families: ScentFamilyDTO[];
  filters: ProductFilters;
  onChange: (key: keyof ProductFilters, value: string | number | undefined) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  // The search box is uncontrolled and debounced: every keystroke used to write
  // the URL and fire a request, so "amber" cost five round trips.
  const [term, setTerm] = useState(filters.q ?? '');
  const committed = useRef(filters.q ?? '');
  useEffect(() => {
    if (term === committed.current) return;
    const id = setTimeout(() => {
      committed.current = term;
      onChange('q', term || undefined);
    }, 300);
    return () => clearTimeout(id);
    // onChange is recreated per render; the term is the only real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const active = [filters.scentFamily, filters.gender, filters.concentration, filters.minPrice, filters.maxPrice].filter(
    (v) => v !== undefined && v !== '',
  ).length;
  const field = 'field-lux py-2 text-sm';

  return (
    <div className="mb-8">
      {/* Prominent search + a compact Filters toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search" placeholder="Search perfumes…" value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="field-lux w-full py-3 pl-12 text-base"
            aria-label="Search perfumes"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-3 font-body text-sm transition-colors ${open || active ? 'border-accent text-accent' : 'border-hairline text-content hover:border-accent'}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4"><path d="M3 5h18M6 12h12M10 19h4" strokeLinecap="round" /></svg>
          <span className="hidden sm:inline">Filters</span>
          {active > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs text-surface">{active}</span>}
        </button>
      </div>

      {/* Collapsible panel */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-hairline bg-surface p-4 sm:grid-cols-3 lg:grid-cols-4">
              <select aria-label="Scent family" value={filters.scentFamily ?? ''} onChange={(e) => onChange('scentFamily', e.target.value || undefined)} className={field}>
                <option value="">All families</option>
                {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select aria-label="Gender" value={filters.gender ?? ''} onChange={(e) => onChange('gender', e.target.value || undefined)} className={field}>
                <option value="">All genders</option>
                {GENDER.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <select aria-label="Concentration" value={filters.concentration ?? ''} onChange={(e) => onChange('concentration', e.target.value || undefined)} className={field}>
                <option value="">All strengths</option>
                {CONCENTRATION.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select aria-label="Sort" value={filters.sort ?? 'newest'} onChange={(e) => onChange('sort', e.target.value)} className={field}>
                {PRODUCT_SORT.map((s) => <option key={s} value={s}>Sort: {s}</option>)}
              </select>
              <input type="number" min={0} placeholder="Min EGP" defaultValue={filters.minPrice ?? ''} onChange={(e) => onChange('minPrice', e.target.value ? Number(e.target.value) : undefined)} className={field} aria-label="Minimum price" />
              <input type="number" min={0} placeholder="Max EGP" defaultValue={filters.maxPrice ?? ''} onChange={(e) => onChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)} className={field} aria-label="Maximum price" />
              <button onClick={onReset} className="col-span-2 rounded-lg border border-hairline py-2 font-body text-sm text-muted transition-colors hover:border-accent hover:text-accent sm:col-span-1">Reset</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
