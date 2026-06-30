import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProductDetail from './ProductDetail';
import type { ProductDTO } from '@herencia/shared';

const product: ProductDTO = {
  id: '1', name: 'Royal Oud', slug: 'royal-oud', type: 'perfume', shortDesc: 'Regal', description: 'A long description.',
  images: ['herencia/royal-oud'], sizes: [{ label: '50ml', price: 1200, stock: 5 }], basePrice: 1200,
  scentFamily: { id: 'f', name: 'Woody', slug: 'woody', order: 1 },
  notes: { top: ['Bergamot'], heart: ['Rose'], base: ['Oud'] },
  gender: 'unisex', concentration: 'EDP', rating: { avg: 4.5, count: 10 }, isFeatured: true, isActive: true, seo: {},
};

afterEach(() => vi.restoreAllMocks());

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/products/:slug" element={<ProductDetail />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductDetail', () => {
  it('renders product name, notes, and price after load', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.endsWith('/related')
        ? new Response(JSON.stringify([]), { status: 200 })
        : new Response(JSON.stringify(product), { status: 200 }),
    ));
    renderAt('/products/royal-oud');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Royal Oud' })).toBeInTheDocument());
    expect(screen.getByText('Bergamot')).toBeInTheDocument();
    expect(screen.getByText('EGP 1,200')).toBeInTheDocument();
  });
});
