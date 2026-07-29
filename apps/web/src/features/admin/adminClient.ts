// apps/web/src/features/admin/adminClient.ts
import type { AdminProductInput, AdminUpdateOrderInput, ProductDTO, ProductListDTO, ScentFamilyDTO, OrderDTO, OrderStatus, ReviewDTO, QuizQuestionAdminDTO, QuizQuestionInput, BannerDTO, BannerInput, BlogPostDTO, BlogPostInput, SubscriberDTO, CustomerDTO, AdminStatsDTO, DiscountCodeDTO, DiscountCodeInput, StaleUnpaidDTO, ReleaseStaleResultDTO } from '@herencia/shared';
import { apiSend, apiGet, apiGetBlob } from '../../lib/api';

type Paged<T> = { items: T[]; total: number; page: number; pages: number };

export const adminFetchSubscribers = (page = 1) =>
  apiGet<Paged<SubscriberDTO>>(`/api/admin/subscribers?page=${page}`);
export const adminFetchCustomers = (page = 1) =>
  apiGet<Paged<CustomerDTO>>(`/api/admin/customers?page=${page}`);
export const adminFetchStats = () => apiGet<AdminStatsDTO>('/api/admin/stats');
export const adminFetchDiscounts = () => apiGet<DiscountCodeDTO[]>('/api/admin/discounts');
export const adminCreateDiscount = (data: DiscountCodeInput) =>
  apiSend<DiscountCodeDTO>('POST', '/api/admin/discounts', data);
export const adminUpdateDiscount = (id: string, data: DiscountCodeInput) =>
  apiSend<DiscountCodeDTO>('PUT', `/api/admin/discounts/${id}`, data);
export const adminDeleteDiscount = (id: string) =>
  apiSend<void>('DELETE', `/api/admin/discounts/${id}`);

// Triggers a browser download of the orders CSV (honors status/q filters).
export async function adminDownloadOrdersCsv(opts: { status?: OrderStatus; q?: string } = {}): Promise<void> {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.q) params.set('q', opts.q);
  const qs = params.toString();
  const blob = await apiGetBlob(`/api/admin/orders-export${qs ? `?${qs}` : ''}`);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `herencia-orders${opts.status ? `-${opts.status}` : ''}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Admin catalog listing — includes deactivated products, which the public
// /api/products endpoint filters out (they'd be unreachable in admin otherwise).
export const adminFetchProducts = (opts: { page?: number; limit?: number; q?: string } = {}) => {
  const params = new URLSearchParams();
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.q) params.set('q', opts.q);
  const qs = params.toString();
  return apiGet<ProductListDTO>(`/api/admin/products${qs ? `?${qs}` : ''}`);
};

export const adminCreateProduct = (data: AdminProductInput) =>
  apiSend<ProductDTO>('POST', '/api/admin/products', data);
export const adminUpdateProduct = (id: string, data: AdminProductInput) =>
  apiSend<ProductDTO>('PUT', `/api/admin/products/${id}`, data);
export const adminDeleteProduct = (id: string) =>
  apiSend<void>('DELETE', `/api/admin/products/${id}`);
export const adminCreateFamily = (data: { name: string; order?: number; description?: string }) =>
  apiSend<ScentFamilyDTO>('POST', '/api/admin/scent-families', data);
export const adminDeleteFamily = (id: string) =>
  apiSend<void>('DELETE', `/api/admin/scent-families/${id}`);

type SignResponse = { timestamp: number; signature: string; apiKey: string; cloudName: string; folder: string };
export const adminSignUpload = () => apiSend<SignResponse>('POST', '/api/admin/uploads/sign', {});

// Signs, then uploads directly to Cloudinary; returns the stored public_id.
export async function uploadImage(file: File): Promise<string> {
  const sig = await adminSignUpload();
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? 'Cloudinary upload failed');
  }
  const body = (await res.json()) as { public_id: string };
  return body.public_id;
}

export const adminFetchOrders = (opts: { status?: OrderStatus; q?: string; page?: number } = {}) => {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.q) params.set('q', opts.q);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const qs = params.toString();
  return apiGet<{ items: OrderDTO[]; total: number; page: number; pages: number }>(
    `/api/admin/orders${qs ? `?${qs}` : ''}`,
  );
};
export const adminUpdateOrderStatus = (id: string, status: OrderStatus) =>
  apiSend<OrderDTO>('PUT', `/api/admin/orders/${id}/status`, { status });
export const adminMarkOrderPaid = (id: string, paid: boolean) =>
  apiSend<OrderDTO>('PUT', `/api/admin/orders/${id}/paid`, { paid });
export const adminDeleteOrder = (id: string) =>
  apiSend<void>('DELETE', `/api/admin/orders/${id}`);
export const adminUpdateOrder = (id: string, input: AdminUpdateOrderInput) =>
  apiSend<OrderDTO>('PUT', `/api/admin/orders/${id}`, input);
export const adminFetchStaleUnpaid = (hours?: number) =>
  apiGet<StaleUnpaidDTO>(`/api/admin/orders/stale-unpaid${hours ? `?hours=${hours}` : ''}`);
export const adminReleaseStale = (hours: number) =>
  apiSend<ReleaseStaleResultDTO>('POST', '/api/admin/orders/release-stale', { hours });

export const adminFetchReviews = (status?: 'pending' | 'approved') =>
  apiGet<{ items: ReviewDTO[]; total: number; page: number; pages: number }>(`/api/admin/reviews${status ? `?status=${status}` : ''}`);
export const adminModerateReview = (id: string, isApproved: boolean) =>
  apiSend<ReviewDTO>('PUT', `/api/admin/reviews/${id}`, { isApproved });
export const adminDeleteReview = (id: string) =>
  apiSend<void>('DELETE', `/api/admin/reviews/${id}`);

export const adminFetchQuiz = () => apiGet<QuizQuestionAdminDTO[]>('/api/admin/quiz');
export const adminCreateQuestion = (input: QuizQuestionInput) => apiSend<QuizQuestionAdminDTO>('POST', '/api/admin/quiz', input);
export const adminUpdateQuestion = (id: string, input: QuizQuestionInput) => apiSend<QuizQuestionAdminDTO>('PUT', `/api/admin/quiz/${id}`, input);
export const adminDeleteQuestion = (id: string) => apiSend<void>('DELETE', `/api/admin/quiz/${id}`);

export const adminFetchBanners = () => apiGet<BannerDTO[]>('/api/admin/banners');
export const adminCreateBanner = (input: BannerInput) => apiSend<BannerDTO>('POST', '/api/admin/banners', input);
export const adminUpdateBanner = (id: string, input: BannerInput) => apiSend<BannerDTO>('PUT', `/api/admin/banners/${id}`, input);
export const adminDeleteBanner = (id: string) => apiSend<void>('DELETE', `/api/admin/banners/${id}`);

export const adminFetchBlog = () => apiGet<{ items: BlogPostDTO[]; total: number; page: number; pages: number }>('/api/admin/blog');
export const adminCreateBlogPost = (input: BlogPostInput) => apiSend<BlogPostDTO>('POST', '/api/admin/blog', input);
export const adminUpdateBlogPost = (id: string, input: BlogPostInput) => apiSend<BlogPostDTO>('PUT', `/api/admin/blog/${id}`, input);
export const adminDeleteBlogPost = (id: string) => apiSend<void>('DELETE', `/api/admin/blog/${id}`);

import type { UpdateSettingsInput, SettingDTO, NoteIconDTO, NoteIconInput } from '@herencia/shared';
export const adminUpdateSettings = (input: UpdateSettingsInput) =>
  apiSend<SettingDTO>('PUT', '/api/admin/settings', input);

export const adminCreateNoteIcon = (input: NoteIconInput) =>
  apiSend<NoteIconDTO>('POST', '/api/admin/notes', input);
export const adminDeleteNoteIcon = (id: string) =>
  apiSend<void>('DELETE', `/api/admin/notes/${id}`);

export { apiGet };
