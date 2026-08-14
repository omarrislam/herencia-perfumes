import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WishlistButton } from './WishlistButton';
import { AuthProvider } from '../features/auth/AuthContext';
import * as api from '../lib/api';

describe('WishlistButton', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('redirects a guest to login on click (no API call)', async () => {
    vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'no'));
    const add = vi.spyOn(api, 'addWishlist').mockResolvedValue({ ok: true });
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><MemoryRouter><AuthProvider><WishlistButton productId={'a'.repeat(24)} /></AuthProvider></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    fireEvent.click(screen.getByRole('button'));
    expect(add).not.toHaveBeenCalled();
  });
  it('adds to wishlist for a logged-in user', async () => {
    vi.spyOn(api, 'fetchMe').mockResolvedValue({ id: '1', name: 'Mai', email: 'm@x.com', role: 'customer' });
    const add = vi.spyOn(api, 'addWishlist').mockResolvedValue({ ok: true });
    const qc = new QueryClient();
    render(<QueryClientProvider client={qc}><MemoryRouter><AuthProvider><WishlistButton productId={'a'.repeat(24)} /></AuthProvider></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(add).toHaveBeenCalled());
  });
  it('pops the heart when adding, but not when removing', async () => {
    // Celebrating a removal is exactly the sort of animation that makes an
    // interface tiring, so the pop is add-only.
    vi.spyOn(api, 'fetchMe').mockResolvedValue({ id: 'u1', name: 'Mai', email: 'm@x.com', role: 'customer' });
    vi.spyOn(api, 'addWishlist').mockResolvedValue({ ok: true });
    vi.spyOn(api, 'removeWishlist').mockResolvedValue([]);
    const qc = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={qc}><MemoryRouter><AuthProvider>
        <WishlistButton productId={'a'.repeat(24)} />
      </AuthProvider></MemoryRouter></QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(container.querySelector('svg.heart-pop')).toBeTruthy());

    // Now filled; removing must not pop.
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    fireEvent.animationEnd(container.querySelector('svg')!);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false'));
    expect(container.querySelector('svg.heart-pop')).toBeNull();
  });

  it('conveys state by fill, so it still reads under reduced motion', async () => {
    vi.spyOn(api, 'fetchMe').mockResolvedValue({ id: 'u1', name: 'Mai', email: 'm@x.com', role: 'customer' });
    vi.spyOn(api, 'addWishlist').mockResolvedValue({ ok: true });
    const qc = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={qc}><MemoryRouter><AuthProvider>
        <WishlistButton productId={'a'.repeat(24)} />
      </AuthProvider></MemoryRouter></QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    expect(container.querySelector('svg')!.getAttribute('fill')).toBe('none');
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(container.querySelector('svg')!.getAttribute('fill')).toBe('var(--accent)'));
  });
});
