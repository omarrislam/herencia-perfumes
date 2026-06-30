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
});
