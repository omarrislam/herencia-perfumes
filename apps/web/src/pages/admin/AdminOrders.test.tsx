import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminOrders from './AdminOrders';
import * as client from '../../features/admin/adminClient';

function wrap(ui: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>;
}

function mockOrders(overrides: Record<string, unknown> = {}) {
  vi.spyOn(client, 'adminFetchStaleUnpaid').mockResolvedValue({ count: 0, hours: 48 });
  vi.spyOn(client, 'adminFetchOrders').mockResolvedValue({
    items: [{ id: '1', orderNumber: 'HRC-1',
      items: [{ product: 'p1', name: 'Royal Oud', sizeLabel: '50ml', unitPrice: 800, qty: 1, image: '' }],
      customer: { name: 'Mai', phone: '01000000000' },
      shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
      subtotal: 800, shipping: 50, discount: 0, total: 850, status: 'pending', paymentMethod: 'cod',
      statusHistory: [{ status: 'pending', at: '2026-06-30T00:00:00Z' }],
      createdAt: '2026-06-30T00:00:00Z', ...overrides }],
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

  it('expands a row into order details', async () => {
    mockOrders();
    render(wrap(<AdminOrders />));
    await waitFor(() => expect(screen.getByText('HRC-1')).toBeInTheDocument());

    // details hidden until the row is clicked
    expect(screen.queryByText('1 St')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('HRC-1'));
    // details panel + the print-only receipt both render the order content
    expect(screen.getAllByText('1 St').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Royal Oud/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cash on delivery').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /print order/i })).toBeInTheDocument();
  });

  // Cancelling restores stock, deleting doesn't — so a live order must be
  // cancelled first or its units silently disappear from inventory.
  it('blocks deleting a live order', async () => {
    mockOrders();
    const del = vi.spyOn(client, 'adminDeleteOrder').mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(wrap(<AdminOrders />));
    await waitFor(() => expect(screen.getByText('HRC-1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('HRC-1'));

    const button = screen.getByRole('button', { name: /delete order/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(del).not.toHaveBeenCalled();
    expect(screen.getByText(/returns the stock/i)).toBeInTheDocument();
  });

  it('deletes a cancelled order after confirm', async () => {
    mockOrders({ status: 'cancelled' });
    const del = vi.spyOn(client, 'adminDeleteOrder').mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(wrap(<AdminOrders />));
    await waitFor(() => expect(screen.getByText('HRC-1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('HRC-1'));
    fireEvent.click(screen.getByRole('button', { name: /delete order/i }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('1'));
  });

  it('offers to release stock from stale unpaid InstaPay orders', async () => {
    mockOrders();
    vi.spyOn(client, 'adminFetchStaleUnpaid').mockResolvedValue({ count: 3, hours: 48 });
    const release = vi.spyOn(client, 'adminReleaseStale').mockResolvedValue({ cancelled: 3 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(wrap(<AdminOrders />));

    await waitFor(() => expect(screen.getByText(/3 InstaPay orders/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /release stock/i }));
    await waitFor(() => expect(release).toHaveBeenCalledWith(48));
  });

  it('saves corrected delivery details', async () => {
    mockOrders();
    const save = vi.spyOn(client, 'adminUpdateOrder').mockResolvedValue({} as never);
    render(wrap(<AdminOrders />));
    await waitFor(() => expect(screen.getByText('HRC-1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('HRC-1'));
    fireEvent.click(screen.getByRole('button', { name: /edit details/i }));

    fireEvent.change(screen.getByLabelText(/customer name/i), { target: { value: 'Mai Hassan' } });
    fireEvent.change(screen.getByLabelText(/^phone$/i), { target: { value: '01111111111' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0]![1].customer).toMatchObject({ name: 'Mai Hassan', phone: '01111111111' });
  });

  it('surfaces a validation error instead of saving a bad phone', async () => {
    mockOrders();
    const save = vi.spyOn(client, 'adminUpdateOrder').mockResolvedValue({} as never);
    render(wrap(<AdminOrders />));
    await waitFor(() => expect(screen.getByText('HRC-1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('HRC-1'));
    fireEvent.click(screen.getByRole('button', { name: /edit details/i }));

    fireEvent.change(screen.getByLabelText(/^phone$/i), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText(/valid Egyptian mobile number/i)).toBeInTheDocument();
  });

  it('shows an unpaid InstaPay badge and marks the payment received', async () => {
    mockOrders({ paymentMethod: 'instapay' });
    const paid = vi.spyOn(client, 'adminMarkOrderPaid').mockResolvedValue({} as never);
    render(wrap(<AdminOrders />));
    await waitFor(() => expect(screen.getByText('HRC-1')).toBeInTheDocument());
    expect(screen.getByText('InstaPay · unpaid')).toBeInTheDocument();

    fireEvent.click(screen.getByText('HRC-1'));
    fireEvent.click(screen.getByRole('button', { name: /mark payment received/i }));
    await waitFor(() => expect(paid).toHaveBeenCalledWith('1', true));
  });

  it('shows a COD badge for cash orders', async () => {
    mockOrders();
    render(wrap(<AdminOrders />));
    await waitFor(() => expect(screen.getByText('HRC-1')).toBeInTheDocument());
    expect(screen.getByText('COD')).toBeInTheDocument();
  });
});
