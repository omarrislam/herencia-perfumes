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
  it('renders approved reviews and a sign-in prompt for guests', async () => {
    vi.spyOn(api, 'fetchReviews').mockResolvedValue({
      items: [{ id: '1', productId: 'p', user: { id: 'u', name: 'Mai' }, rating: 5, body: 'Wonderful', isApproved: true, createdAt: '2026-07-01T00:00:00Z' }],
      total: 1, page: 1, pages: 1,
    });
    render(wrap(<ReviewsSection slug="royal-oud" productId="p" />));
    await waitFor(() => expect(screen.getByText('Wonderful')).toBeInTheDocument());
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });
});
