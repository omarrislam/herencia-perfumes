import type { ProductDTO, ProductListDTO, ScentFamilyDTO } from '@herencia/shared';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseError(res: Response): Promise<never> {
  let message = res.statusText;
  try {
    const body = (await res.json()) as { error?: { message?: string } } | null;
    message = body?.error?.message ?? message;
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(res.status, message);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

export async function apiSend<T>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!res.ok) return parseError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type ProductFilters = {
  q?: string;
  type?: 'perfume' | 'bundle';
  scentFamily?: string;
  gender?: string;
  concentration?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
};

export function fetchProducts(filters: ProductFilters): Promise<ProductListDTO> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
  }
  const qs = params.toString();
  return apiGet<ProductListDTO>(`/api/products${qs ? `?${qs}` : ''}`);
}

export const fetchProduct = (slug: string) => apiGet<ProductDTO>(`/api/products/${slug}`);
export const fetchRelated = (slug: string) => apiGet<ProductDTO[]>(`/api/products/${slug}/related`);
export const fetchScentFamilies = () => apiGet<ScentFamilyDTO[]>('/api/scent-families');

export type PublicSettings = {
  whatsappNumber: string;
  shippingFee: number;
  freeShippingThreshold?: number;
  socialLinks: { instagram?: string; facebook?: string; tiktok?: string };
  hero: { title: string; subtitle: string; ctaText: string; ctaLink: string; image: string };
  contactEmail?: string;
};
export const fetchSettings = () => apiGet<PublicSettings>('/api/settings');
