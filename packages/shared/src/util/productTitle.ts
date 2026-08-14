const BRAND = 'HERENCIA';

type TitleInput = {
  name: string;
  sizes: { label: string }[];
  concentration?: string;
};

/**
 * The bottle size, but only when the product has exactly one — with several sizes there
 * is no single answer, and naming one would be wrong.
 */
export function soleSizeLabel(p: Pick<TitleInput, 'sizes'>): string | undefined {
  return p.sizes.length === 1 ? p.sizes[0]!.label : undefined;
}

/**
 * The page title for a product, e.g. `Ashes — 55ml EDP — HERENCIA`.
 *
 * Lives in shared because BOTH sides must produce the identical string: the API bakes it
 * into the served HTML, and the client re-applies it via useSeo on hydration. If the two
 * drifted, a JS-rendering crawler would index whatever the client wrote over the top.
 *
 * Size and concentration are in the title deliberately — the long-tail queries are
 * "55ml perfume", not the bare product name.
 */
export function productTitle(p: TitleInput): string {
  const qualifier = [soleSizeLabel(p), p.concentration !== 'Other' ? p.concentration : undefined]
    .filter(Boolean)
    .join(' ');
  return [p.name, qualifier || undefined, BRAND].filter(Boolean).join(' — ');
}
