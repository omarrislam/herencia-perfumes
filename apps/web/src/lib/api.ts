import type { ProductDTO, ProductListDTO, ScentFamilyDTO, UserDTO, LoginInput, RegisterInput, PricedCartDTO, CartItemInput, CreateOrderInput, CreateOrderResultDTO, AddressDTO, UpdateProfileInput, AddressInput, OrderDTO, ReviewDTO, CreateReviewInput } from '@herencia/shared';

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
  limit?: number;
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

export const login = (input: LoginInput) => apiSend<UserDTO>('POST', '/api/auth/login', input);
export const register = (input: RegisterInput) => apiSend<UserDTO>('POST', '/api/auth/register', input);
export const logout = () => apiSend<void>('POST', '/api/auth/logout');
export const fetchMe = () => apiGet<UserDTO>('/api/auth/me');

export const priceCart = (items: CartItemInput[]) => apiSend<PricedCartDTO>('POST', '/api/cart/price', { items });
export const getServerCart = () => apiGet<PricedCartDTO>('/api/cart');
export const setServerCart = (items: CartItemInput[]) => apiSend<PricedCartDTO>('PUT', '/api/cart', { items });
export const mergeServerCart = (items: CartItemInput[]) => apiSend<PricedCartDTO>('POST', '/api/cart/merge', { items });

export const createOrder = (input: CreateOrderInput) => apiSend<CreateOrderResultDTO>('POST', '/api/orders', input);

export const fetchProfile = () => apiGet<UserDTO>('/api/account/profile');
export const updateProfile = (input: UpdateProfileInput) => apiSend<UserDTO>('PUT', '/api/account/profile', input);
export const fetchAddresses = () => apiGet<AddressDTO[]>('/api/account/addresses');
export const addAddress = (input: AddressInput) => apiSend<AddressDTO>('POST', '/api/account/addresses', input);
export const updateAddress = (id: string, input: AddressInput) => apiSend<AddressDTO[]>('PUT', `/api/account/addresses/${id}`, input);
export const deleteAddress = (id: string) => apiSend<AddressDTO[]>('DELETE', `/api/account/addresses/${id}`);
export const fetchWishlist = () => apiGet<ProductDTO[]>('/api/account/wishlist');
export const addWishlist = (productId: string) => apiSend<{ ok: true }>('POST', '/api/account/wishlist', { productId });
export const removeWishlist = (productId: string) => apiSend<ProductDTO[]>('DELETE', `/api/account/wishlist/${productId}`);
export const fetchMyOrders = () => apiGet<{ items: OrderDTO[]; total: number; page: number; pages: number }>('/api/orders/me');

export const fetchReviews = (slug: string, page = 1) =>
  apiGet<{ items: ReviewDTO[]; total: number; page: number; pages: number }>(`/api/products/${slug}/reviews?page=${page}`);
export const submitReview = (slug: string, input: CreateReviewInput) =>
  apiSend<ReviewDTO>('POST', `/api/products/${slug}/reviews`, input);
