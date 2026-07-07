import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminOrders from './AdminOrders';
import * as client from '../../features/admin/adminClient';

function wrap(ui: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>;
}

function mockOrders() {
  vi.spyOn(client, 'adminFetchOrders').mockResolvedValue({
    items: [{ id: '1', orderNumber: 'HRC-1',
      items: [{ product: 'p1', name: 'Royal Oud', sizeLabel: '50ml', unitPrice: 800, qty: 1, image: '' }],
      customer: { name: 'Mai', phone: '0100000000' },
      shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '0100000000' },
      subtotal: 800, shipping: 50, discount: 0, total: 850, status: 'pending', paymentMethod: 'cod', createdAt: '2026-06-30T00:00:00Z' }],
    total: 1, page: 1, pages: 1,
  });
}

describe('AdminOrders', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('renders orders from the admin API', async () => {
    mockOrders();
    render(wrap(<AdminOrders />));
    await waitFor(() => expect(screen.getByText('HRC-1')).toBeInTheDocument());
    expect(screen.getByText(/Mai/)).toBeInTheDocument();
  });

  it('expands a row into order details and deletes after confirm', async () => {
    mockOrders();
    const del = vi.spyOn(client, 'adminDeleteOrder').mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(wrap(<AdminOrders />));
    await waitFor(() => expect(screen.getByText('HRC-1')).toBeInTheDocument());

    // details hidden until the row is clicked
    expect(screen.queryByText('1 St')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('HRC-1'));
    expect(screen.getByText('1 St')).toBeInTheDocument();
    expect(screen.getByText(/Royal Oud/)).toBeInTheDocument();
    expect(screen.getByText('Cash on delivery')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /delete order/i }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('1'));
  });
});
