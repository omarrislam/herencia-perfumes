// apps/web/src/features/admin/adminClient.ts
import type { AdminProductInput, ProductDTO, ScentFamilyDTO, OrderDTO, OrderStatus } from '@herencia/shared';
import { apiSend, apiGet } from '../../lib/api';

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

export const adminFetchOrders = (status?: OrderStatus) =>
  apiGet<{ items: OrderDTO[]; total: number; page: number; pages: number }>(
    `/api/admin/orders${status ? `?status=${status}` : ''}`,
  );
export const adminUpdateOrderStatus = (id: string, status: OrderStatus) =>
  apiSend<OrderDTO>('PUT', `/api/admin/orders/${id}/status`, { status });

export { apiGet };
