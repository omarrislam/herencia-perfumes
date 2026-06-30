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
});
