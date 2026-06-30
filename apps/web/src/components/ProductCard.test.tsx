import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import type { ProductDTO } from '@herencia/shared';

const product: ProductDTO = {
  id: '1', name: 'Royal Oud', slug: 'royal-oud', type: 'perfume', shortDesc: 'Regal', description: 'd',
  images: ['herencia/royal-oud'], sizes: [{ label: '50ml', price: 1200, stock: 5 }], basePrice: 1200,
  scentFamily: { id: 'f', name: 'Woody', slug: 'woody', order: 1 }, notes: { top: [], heart: [], base: [] },
  gender: 'unisex', concentration: 'EDP', rating: { avg: 4.5, count: 10 }, isFeatured: true, isActive: true, seo: {},
};

describe('ProductCard', () => {
  it('renders name, price, and links to the detail page', () => {
    render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
    expect(screen.getByText('Royal Oud')).toBeInTheDocument();
    expect(screen.getByText('EGP 1,200')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/products/royal-oud');
  });
  it('links bundles to the /bundles path', () => {
    render(<MemoryRouter><ProductCard product={{ ...product, type: 'bundle', slug: 'woody-duo' }} /></MemoryRouter>);
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
    render(<MemoryRouter><ProductCard product={p as never} /></MemoryRouter>);
    // compareAt for the basePrice (800) size is 1000, not 1500
    expect(screen.getByText(/1,?000/)).toBeInTheDocument();
    expect(screen.queryByText(/1,?500/)).not.toBeInTheDocument();
  });
});
