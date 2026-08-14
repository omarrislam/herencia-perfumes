import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewsSection } from './ReviewsSection';
import { AuthProvider } from '../auth/AuthContext';
import * as api from '../../lib/api';

function wrap(ui: React.ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><AuthProvider>{ui}</AuthProvider></MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ReviewsSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'no'));
  });
  it('renders approved reviews and offers guests a real review form', async () => {
    // Guests used to get a sign-in wall. Guest checkout is the norm here, so almost
    // nobody could review — they now prove the purchase with an order number + phone.
    vi.spyOn(api, 'fetchReviews').mockResolvedValue({
      items: [{ id: '1', productId: 'p', user: { id: 'u', name: 'Mai' }, rating: 5, body: 'Wonderful', isApproved: true, createdAt: '2026-07-01T00:00:00Z' }],
      total: 1, page: 1, pages: 1,
    });
    render(wrap(<ReviewsSection slug="royal-oud" productId="p" />));
    await waitFor(() => expect(screen.getByText('Wonderful')).toBeInTheDocument());
    expect(screen.getByLabelText(/order number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone used to order/i)).toBeInTheDocument();
    expect(screen.queryByText(/sign in to write a review/i)).not.toBeInTheDocument();
  });

  it('marks a verified-buyer review so shoppers can trust it', async () => {
    vi.spyOn(api, 'fetchReviews').mockResolvedValue({
      items: [{ id: '1', productId: 'p', user: { name: 'Mai' }, verifiedBuyer: true, rating: 5, body: 'Wonderful', isApproved: true, createdAt: '2026-07-01T00:00:00Z' }],
      total: 1, page: 1, pages: 1,
    });
    render(wrap(<ReviewsSection slug="royal-oud" productId="p" />));
    await waitFor(() => expect(screen.getByText('Wonderful')).toBeInTheDocument());
    expect(screen.getByText(/verified buyer/i)).toBeInTheDocument();
  });
});
