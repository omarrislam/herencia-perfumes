import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BannerStrip } from './BannerStrip';
import * as api from '../lib/api';

function wrap(ui: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>;
}

describe('BannerStrip', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('renders active banners for a placement', async () => {
    vi.spyOn(api, 'fetchBanners').mockResolvedValue([
      { id: '1', title: 'Summer Sale', image: 'banners/summer', placement: 'home_hero', isActive: true, order: 1 },
    ]);
    render(wrap(<BannerStrip placement="home_hero" />));
    await waitFor(() => expect(screen.getByText('Summer Sale')).toBeInTheDocument());
  });
  it('renders nothing when there are no banners', async () => {
    vi.spyOn(api, 'fetchBanners').mockResolvedValue([]);
    const { container } = render(wrap(<BannerStrip placement="global_top" />));
    await waitFor(() => expect(api.fetchBanners).toHaveBeenCalled());
    expect(container.querySelector('[data-banner]')).toBeNull();
  });
});
