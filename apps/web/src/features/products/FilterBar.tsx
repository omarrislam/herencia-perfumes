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
  return (
    <div className="mb-6 grid gap-3 rounded-lg border border-line bg-surface p-4 md:grid-cols-3">
      <input
        type="search" placeholder="Search perfumes…" defaultValue={filters.q ?? ''}
        onChange={(e) => onChange('q', e.target.value || undefined)}
        className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content md:col-span-3"
        aria-label="Search perfumes"
      />
      <select aria-label="Scent family" value={filters.scentFamily ?? ''} onChange={(e) => onChange('scentFamily', e.target.value || undefined)} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content">
        <option value="">All scent families</option>
        {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <select aria-label="Gender" value={filters.gender ?? ''} onChange={(e) => onChange('gender', e.target.value || undefined)} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content">
        <option value="">All genders</option>
        {GENDER.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <select aria-label="Concentration" value={filters.concentration ?? ''} onChange={(e) => onChange('concentration', e.target.value || undefined)} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content">
        <option value="">All concentrations</option>
        {CONCENTRATION.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input type="number" min={0} placeholder="Min EGP" defaultValue={filters.minPrice ?? ''} onChange={(e) => onChange('minPrice', e.target.value ? Number(e.target.value) : undefined)} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content" aria-label="Minimum price" />
      <input type="number" min={0} placeholder="Max EGP" defaultValue={filters.maxPrice ?? ''} onChange={(e) => onChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content" aria-label="Maximum price" />
      <select aria-label="Sort" value={filters.sort ?? 'newest'} onChange={(e) => onChange('sort', e.target.value)} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content">
        {PRODUCT_SORT.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <button onClick={onReset} className="rounded-md border border-gold px-3 py-2 font-body text-sm text-content hover:bg-gold/10 md:col-span-3">Reset filters</button>
    </div>
  );
}
