import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import * as api from '../lib/api';
import { AuthProvider } from '../features/auth/AuthContext';
import { CartProvider } from '../features/cart/CartContext';
import { SampleProvider } from '../features/samples/SampleContext';
import type { ProductDTO, ProductListDTO } from '@herencia/shared';

// Four featured products puts the section in its carousel branch (> 3 items),
// which is what production runs with.
function product(i: number): ProductDTO {
  return {
    id: `p${i}`,
    name: `Perfume ${i}`,
    slug: `perfume-${i}`,
    type: 'perfume',
    shortDesc: 'Short',
    description: 'Long',
    images: [`herencia/p${i}`],
    sizes: [{ label: '50ml', price: 1000, stock: 5 }],
    basePrice: 1000,
    scentFamily: { id: 'f1', name: 'Woody', slug: 'woody', order: 1 },
    notes: { top: [], heart: [], base: [] },
    gender: 'unisex',
    concentration: 'EDP',
    rating: { avg: 0, count: 0 },
    isFeatured: true,
    isActive: true,
    seo: {},
    sampleStock: 5,
  };
}

const featuredList: ProductListDTO = {
  items: [product(1), product(2), product(3), product(4)],
  total: 4,
  page: 1,
  pages: 1,
};

/** True when the element or any ancestor is held invisible by an inline opacity. */
function hiddenByInlineOpacity(el: HTMLElement): boolean {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    const inline = n.style.opacity;
    if (inline !== '' && Number(inline) === 0) return true;
  }
  return false;
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;

  // An IntersectionObserver that is installed but NEVER reports an intersection.
  // This is the real production case for the featured carousel: cards parked
  // off-screen to the right never intersect the viewport on either axis.
  class NeverIntersects {
    root = null;
    rootMargin = '';
    thresholds: number[] = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal('IntersectionObserver', NeverIntersects);

  vi.spyOn(api, 'fetchProducts').mockResolvedValue(featuredList);
  vi.spyOn(api, 'fetchSettings').mockRejectedValue(new api.ApiError(500, 'no settings in test'));
  vi.spyOn(api, 'fetchReviewHighlights').mockResolvedValue({ items: [] });
  vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'anonymous'));
  vi.spyOn(api, 'priceCart').mockResolvedValue({
    items: [],
    subtotal: 0,
    shipping: 0,
    total: 0,
    hasUnavailable: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <CartProvider>
            <SampleProvider>
              <Home />
            </SampleProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Home featured products', () => {
  it('renders every featured product even when none is ever scrolled into view', async () => {
    renderHome();

    await waitFor(() => expect(screen.getByRole('link', { name: /Perfume 1/i })).toBeInTheDocument());

    for (const i of [1, 2, 3, 4]) {
      expect(screen.getByRole('link', { name: new RegExp(`Perfume ${i}`, 'i') })).toBeInTheDocument();
    }
  });

  it('does not leave featured cards invisible when the viewport never intersects them', async () => {
    renderHome();

    await waitFor(() => expect(screen.getByRole('link', { name: /Perfume 1/i })).toBeInTheDocument());

    for (const i of [1, 2, 3, 4]) {
      const card = screen.getByRole('link', { name: new RegExp(`Perfume ${i}`, 'i') });
      expect(
        hiddenByInlineOpacity(card),
        `featured card "Perfume ${i}" is stuck at opacity 0 — it never becomes visible`,
      ).toBe(false);
    }
  });
});
