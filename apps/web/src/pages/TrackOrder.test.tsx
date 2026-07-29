import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { OrderDTO } from '@herencia/shared';
import TrackOrder from './TrackOrder';
import * as api from '../lib/api';

function wrap(ui: React.ReactNode, initial = '/track') {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[initial]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

const order = {
  id: '1',
  orderNumber: 'HRC-ABC-1234',
  items: [{ product: 'p1', name: 'Royal Oud', sizeLabel: '50ml', unitPrice: 800, qty: 1, image: '' }],
  customer: { name: 'Mai', phone: '01000000000' },
  shippingAddress: { line1: '1 Nile St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
  subtotal: 800,
  shipping: 50,
  discount: 0,
  total: 850,
  status: 'shipped',
  paymentMethod: 'cod',
  statusHistory: [
    { status: 'confirmed', at: '2026-06-30T00:00:00Z' },
    { status: 'shipped', at: '2026-07-01T00:00:00Z' },
  ],
  createdAt: '2026-06-30T00:00:00Z',
} as unknown as OrderDTO;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'fetchSettings').mockResolvedValue({} as never);
});

describe('TrackOrder', () => {
  it('looks an order up and shows its status, items and address', async () => {
    const track = vi.spyOn(api, 'trackOrder').mockResolvedValue(order);
    render(wrap(<TrackOrder />));

    fireEvent.change(screen.getByLabelText(/order number/i), { target: { value: 'HRC-ABC-1234' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '01000000000' } });
    fireEvent.click(screen.getByRole('button', { name: /find my order/i }));

    // React Query hands mutationFn a context object as a second argument.
    await waitFor(() => expect(track).toHaveBeenCalled());
    expect(track.mock.calls[0]![0]).toEqual({ orderNumber: 'HRC-ABC-1234', phone: '01000000000' });
    // "shipped" shows as the status badge and again in the progress timeline.
    expect((await screen.findAllByText('shipped')).length).toBeGreaterThan(0);
    expect(screen.getByText('On its way to you.')).toBeInTheDocument();
    expect(screen.getAllByText(/Royal Oud/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 Nile St/).length).toBeGreaterThan(0);
  });

  it('normalizes a +20 phone before sending it', async () => {
    const track = vi.spyOn(api, 'trackOrder').mockResolvedValue(order);
    render(wrap(<TrackOrder />));
    fireEvent.change(screen.getByLabelText(/order number/i), { target: { value: 'HRC-ABC-1234' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+20 100 000 0000' } });
    fireEvent.click(screen.getByRole('button', { name: /find my order/i }));
    await waitFor(() => expect(track).toHaveBeenCalled());
    expect(track.mock.calls[0]![0]).toEqual({ orderNumber: 'HRC-ABC-1234', phone: '01000000000' });
  });

  it('validates before calling the API', async () => {
    const track = vi.spyOn(api, 'trackOrder').mockResolvedValue(order);
    render(wrap(<TrackOrder />));
    fireEvent.change(screen.getByLabelText(/order number/i), { target: { value: 'HRC-ABC-1234' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /find my order/i }));

    expect(track).not.toHaveBeenCalled();
    expect(await screen.findByText(/valid Egyptian mobile number/i)).toBeInTheDocument();
  });

  it('shows the API message when nothing matches', async () => {
    vi.spyOn(api, 'trackOrder').mockRejectedValue(new Error('No order matches that order number and phone number.'));
    render(wrap(<TrackOrder />));
    fireEvent.change(screen.getByLabelText(/order number/i), { target: { value: 'HRC-NOPE-0000' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '01000000000' } });
    fireEvent.click(screen.getByRole('button', { name: /find my order/i }));

    expect(await screen.findByText(/No order matches/i)).toBeInTheDocument();
  });

  // The confirmation page links here with ?order=… so the customer only has to
  // supply the phone number.
  it('prefills the order number from the query string', () => {
    render(wrap(<TrackOrder />, '/track?order=HRC-ABC-1234'));
    expect(screen.getByLabelText(/order number/i)).toHaveValue('HRC-ABC-1234');
  });
});
