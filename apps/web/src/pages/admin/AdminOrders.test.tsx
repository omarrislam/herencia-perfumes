import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminOrders from './AdminOrders';
import * as client from '../../features/admin/adminClient';

function wrap(ui: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>;
}

describe('AdminOrders', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('renders orders from the admin API', async () => {
    vi.spyOn(client, 'adminFetchOrders').mockResolvedValue({
      items: [{ id: '1', orderNumber: 'HRC-1', items: [], customer: { name: 'Mai', phone: '0100000000' },
        shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '0100000000' },
        subtotal: 800, shipping: 50, discount: 0, total: 850, status: 'pending', paymentMethod: 'cod', createdAt: '2026-06-30T00:00:00Z' }],
      total: 1, page: 1, pages: 1,
    });
    render(wrap(<AdminOrders />));
    await waitFor(() => expect(screen.getByText('HRC-1')).toBeInTheDocument());
    expect(screen.getByText(/Mai/)).toBeInTheDocument();
  });
});
