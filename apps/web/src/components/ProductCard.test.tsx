import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductCard } from './ProductCard';
import { AuthProvider } from '../features/auth/AuthContext';
import { CartProvider } from '../features/cart/CartContext';
import { SampleProvider } from '../features/samples/SampleContext';
import type { ProductDTO } from '@herencia/shared';
import * as api from '../lib/api';

const product: ProductDTO = {
  id: '1', name: 'Royal Oud', slug: 'royal-oud', type: 'perfume', shortDesc: 'Regal', description: 'd',
  images: ['herencia/royal-oud'], sizes: [{ label: '50ml', price: 1200, stock: 5 }], basePrice: 1200,
  scentFamily: { id: 'f', name: 'Woody', slug: 'woody', order: 1 }, notes: { top: [], heart: [], base: [] },
  gender: 'unisex', concentration: 'EDP', rating: { avg: 4.5, count: 10 }, isFeatured: true, isActive: true, seo: {},
  sampleStock: 0,
};

// WishlistButton calls useAuth() which mounts AuthProvider which calls fetchMe.
// Mock it so tests don't make real network calls.
beforeEach(() => {
  vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'no'));
});
afterEach(() => vi.restoreAllMocks());

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <CartProvider>
            <SampleProvider>
              {ui}
            </SampleProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductCard', () => {
  it('renders name, price, and links to the detail page', () => {
    wrap(<ProductCard product={product} />);
    expect(screen.getByText('Royal Oud')).toBeInTheDocument();
    expect(screen.getByText('EGP 1,200')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/products/royal-oud');
  });
  it('links bundles to the /bundles path', () => {
    wrap(<ProductCard product={{ ...product, type: 'bundle', slug: 'woody-duo' }} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/bundles/woody-duo');
  });
  it('shows the compareAt price of the cheapest size, not sizes[0]', () => {
    const p = {
      id: '1', name: 'X', slug: 'x', type: 'perfume', shortDesc: 's', description: 'd',
      images: ['img'], basePrice: 800, scentFamily: null,
      notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
      rating: { avg: 0, count: 0 }, isFeatured: false, isActive: true, seo: {},
      sizes: [
        { label: '100ml', price: 1200, compareAtPrice: 1500, stock: 5 },
        { label: '50ml', price: 800, compareAtPrice: 1000, stock: 5 },
      ],
    } as const;
    wrap(<ProductCard product={p as never} />);
    // compareAt for the basePrice (800) size is 1000, not 1500
    expect(screen.getByText(/1,?000/)).toBeInTheDocument();
    expect(screen.queryByText(/1,?500/)).not.toBeInTheDocument();
  });
  it('does not render TryScentButton when sampleStock is 0', () => {
    wrap(<ProductCard product={product} />);
    expect(screen.queryByRole('button', { name: /order a sample/i })).not.toBeInTheDocument();
  });
  it('renders TryScentButton when perfume has sampleStock > 0', () => {
    const perfumeWithSamples = { ...product, sampleStock: 5 };
    wrap(<ProductCard product={perfumeWithSamples} />);
    expect(screen.getByRole('button', { name: /order a sample/i })).toBeInTheDocument();
  });
});
