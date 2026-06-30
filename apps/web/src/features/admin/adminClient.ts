// apps/web/src/features/admin/adminClient.ts
import type { AdminProductInput, ProductDTO, ScentFamilyDTO } from '@herencia/shared';
import { apiSend, apiGet } from '../../lib/api';

const KEY = 'herencia.adminToken';
export const getAdminToken = (): string => sessionStorage.getItem(KEY) ?? '';
export const setAdminToken = (t: string): void => sessionStorage.setItem(KEY, t);
export const adminHeaders = (): Record<string, string> => ({ 'x-admin-token': getAdminToken() });

export const adminCreateProduct = (data: AdminProductInput) =>
  apiSend<ProductDTO>('POST', '/api/admin/products', data, adminHeaders());
export const adminUpdateProduct = (id: string, data: AdminProductInput) =>
  apiSend<ProductDTO>('PUT', `/api/admin/products/${id}`, data, adminHeaders());
export const adminDeleteProduct = (id: string) =>
  apiSend<void>('DELETE', `/api/admin/products/${id}`, undefined, adminHeaders());
export const adminCreateFamily = (data: { name: string; order?: number; description?: string }) =>
  apiSend<ScentFamilyDTO>('POST', '/api/admin/scent-families', data, adminHeaders());
export const adminDeleteFamily = (id: string) =>
  apiSend<void>('DELETE', `/api/admin/scent-families/${id}`, undefined, adminHeaders());

type SignResponse = { timestamp: number; signature: string; apiKey: string; cloudName: string; folder: string };
export const adminSignUpload = () => apiSend<SignResponse>('POST', '/api/admin/uploads/sign', {}, adminHeaders());

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
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const body = (await res.json()) as { public_id: string };
  return body.public_id;
}

export { apiGet };
