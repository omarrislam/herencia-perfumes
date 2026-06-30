import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProductFilters } from '../../lib/api';

const NUMERIC = new Set(['minPrice', 'maxPrice', 'page']);
const KEYS = ['q', 'scentFamily', 'gender', 'concentration', 'minPrice', 'maxPrice', 'sort', 'page'] as const;

export function parseFiltersFromParams(params: URLSearchParams): ProductFilters {
  const out: ProductFilters = {};
  for (const key of KEYS) {
    const raw = params.get(key);
    if (raw == null || raw === '') continue;
    if (NUMERIC.has(key)) {
      const n = Number(raw);
      if (!Number.isNaN(n)) (out as Record<string, unknown>)[key] = n;
    } else {
      (out as Record<string, unknown>)[key] = raw;
    }
  }
  return out;
}

export function useProductFilters() {
  const [params, setParams] = useSearchParams();
  const resetCountRef = useRef(0);
  const filters = parseFiltersFromParams(params);

  function setFilter(key: keyof ProductFilters, value: string | number | undefined) {
    const next = new URLSearchParams(params);
    if (value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
    if (key !== 'page') next.delete('page'); // reset paging on filter change
    setParams(next, { replace: true });
  }

  function reset() {
    resetCountRef.current += 1;
    setParams(new URLSearchParams(), { replace: true });
  }

  return { filters, setFilter, reset, resetKey: resetCountRef.current };
}
