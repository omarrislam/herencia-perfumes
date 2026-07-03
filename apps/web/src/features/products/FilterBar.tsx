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
  const field = 'field-lux py-1.5 text-sm';
  return (
    <div className="mb-8 flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2.5">
      <input
        type="search" placeholder="Search…" defaultValue={filters.q ?? ''}
        onChange={(e) => onChange('q', e.target.value || undefined)}
        className={`${field} min-w-[150px] flex-1`}
        aria-label="Search perfumes"
      />
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
      <input type="number" min={0} placeholder="Min" defaultValue={filters.minPrice ?? ''} onChange={(e) => onChange('minPrice', e.target.value ? Number(e.target.value) : undefined)} className={`${field} w-20`} aria-label="Minimum price" />
      <input type="number" min={0} placeholder="Max" defaultValue={filters.maxPrice ?? ''} onChange={(e) => onChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)} className={`${field} w-20`} aria-label="Maximum price" />
      <select aria-label="Sort" value={filters.sort ?? 'newest'} onChange={(e) => onChange('sort', e.target.value)} className={field}>
        {PRODUCT_SORT.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <button onClick={onReset} className="ml-auto whitespace-nowrap px-2 py-1.5 font-body text-sm text-accent hover:underline">Reset</button>
    </div>
  );
}
