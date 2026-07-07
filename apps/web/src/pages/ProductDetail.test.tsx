import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProductDetail from './ProductDetail';
import type { ProductDTO } from '@herencia/shared';
import { AuthProvider } from '../features/auth/AuthContext';
import { CartProvider } from '../features/cart/CartContext';
import { SampleProvider } from '../features/samples/SampleContext';
import * as api from '../lib/api';

const product: ProductDTO = {
  id: '1', name: 'Royal Oud', slug: 'royal-oud', type: 'perfume', shortDesc: 'Regal', description: 'A long description.',
  images: ['herencia/royal-oud'], sizes: [{ label: '50ml', price: 1200, stock: 5 }], basePrice: 1200,
  scentFamily: { id: 'f', name: 'Woody', slug: 'woody', order: 1 },
  notes: { top: ['Bergamot'], heart: ['Rose'], base: ['Oud'] },
  gender: 'unisex', concentration: 'EDP', rating: { avg: 4.5, count: 10 }, isFeatured: true, isActive: true, seo: {},
};

beforeEach(() => {
  vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'no'));
  vi.spyOn(api, 'priceCart').mockResolvedValue({ items: [], subtotal: 0, shipping: 0, total: 0, hasUnavailable: false });
  // ReviewsSection is now rendered inside ProductDetail — mock to avoid real fetch
  vi.spyOn(api, 'fetchReviews').mockResolvedValue({ items: [], total: 0, page: 1, pages: 0 });
});
afterEach(() => vi.restoreAllMocks());

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <CartProvider>
            <SampleProvider>
              <Routes><Route path="/products/:slug" element={<ProductDetail />} /></Routes>
            </SampleProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductDetail', () => {
  it('renders product name, notes, and price after load', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.endsWith('/related') || url.endsWith('/api/notes')
        ? new Response(JSON.stringify([]), { status: 200 })
        : new Response(JSON.stringify(product), { status: 200 }),
    ));
    renderAt('/products/royal-oud');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Royal Oud' })).toBeInTheDocument());
    expect(screen.getByText('Bergamot')).toBeInTheDocument();
    expect(screen.getByText('EGP 1,200')).toBeInTheDocument();
  });
});
