// Tiny localStorage cache for product lists (same idea as heroCache): render
// the last-known data instantly while react-query refetches in the background.
// Stale-tolerant by design — prices/stock are re-validated server-side at cart
// pricing and order placement.
const PREFIX = 'herencia.list.';

export function readListCache<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeListCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {
    /* quota/private mode */
  }
}
