import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Checkout from './Checkout';
import { AuthProvider } from '../features/auth/AuthContext';
import { CartProvider } from '../features/cart/CartContext';
import { SampleProvider } from '../features/samples/SampleContext';
import { DEFAULT_SAMPLES_SETTINGS } from '@herencia/shared';
import * as api from '../lib/api';

function setup(settingsOverrides: Record<string, unknown> = {}) {
  vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'no'));
  vi.spyOn(api, 'fetchSettings').mockResolvedValue({
    whatsappNumber: '+20', shippingFee: 50, socialLinks: {},
    hero: { title: 'h', subtitle: 's', ctaText: 'c', ctaLink: '/', image: 'x' },
    homeSections: { hero: true, featured: true, samples: true, essence: true, gifting: true, time: true, testimonials: true, values: true, quiz: true, faq: true },
    sectionOrder: ['featured', 'samples', 'essence', 'gifting', 'time', 'testimonials', 'values', 'quiz', 'faq'],
    instapay: { enabled: false },
    promoBar: { enabled: false },
    emailPopup: { enabled: false },
    samples: DEFAULT_SAMPLES_SETTINGS,
    ...settingsOverrides,
  } as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(api, 'priceCart').mockResolvedValue({
    items: [{ productId: 'a'.repeat(24), slug: 'royal-oud', name: 'Royal Oud', image: 'x', sizeLabel: '50ml', unitPrice: 800, qty: 1, lineTotal: 800, available: true, maxQty: 5 }],
    subtotal: 800, shipping: 50, total: 850, hasUnavailable: false,
  });
  localStorage.setItem('herencia.cart', JSON.stringify([{ productId: 'a'.repeat(24), sizeLabel: '50ml', qty: 1 }]));
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/checkout']}>
        <AuthProvider><CartProvider><SampleProvider>
          <Routes>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation" element={<div>Thank you</div>} />
          </Routes>
        </SampleProvider></CartProvider></AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Checkout', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  it('submits a COD order and navigates to confirmation', async () => {
    const create = vi.spyOn(api, 'createOrder').mockResolvedValue({
      order: { id: '1', orderNumber: 'HRC-1', items: [], customer: { name: 'Mai', phone: '01000000000' },
        shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
        subtotal: 800, shipping: 50, discount: 0, total: 850, status: 'pending', paymentMethod: 'cod',
        statusHistory: [{ status: 'pending', at: '2026-06-30T00:00:00Z' }], createdAt: '2026-06-30T00:00:00Z' },
      whatsappUrl: 'https://wa.me/201000000000?text=hi',
    });
    setup();
    await waitFor(() => expect(screen.getByText(/Royal Oud/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Mai' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '01000000000' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '1 St' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Cairo' } });
    fireEvent.change(screen.getByLabelText('Governorate'), { target: { value: 'Cairo' } });
    fireEvent.click(screen.getByRole('button', { name: /place order/i }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Thank you')).toBeInTheDocument());
  });

  it('shows per-field errors and blocks submission on invalid input', async () => {
    const create = vi.spyOn(api, 'createOrder').mockResolvedValue({} as never);
    setup();
    await waitFor(() => expect(screen.getByText(/Royal Oud/)).toBeInTheDocument());
    // Invalid Egyptian phone + missing required fields
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: /place order/i }));

    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByText(/valid Egyptian mobile number/)).toBeInTheDocument();
    expect(screen.getByText('Address is required')).toBeInTheDocument();
    expect(screen.getByText('City is required')).toBeInTheDocument();
    expect(screen.getByText('Governorate is required')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();

    // Typing in a field clears its error
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Mai' } });
    expect(screen.queryByText('Full name is required')).not.toBeInTheDocument();
  });

  // Eligibility for the welcome code is settled server-side at submit (first
  // order per phone number), so a customer told "remove the code" must have a
  // control to remove it — the applied state used to hide the field entirely.
  it('lets the customer remove an applied discount code', async () => {
    localStorage.setItem('herencia.discountCode', 'WELCOME10');
    setup({ emailPopup: { enabled: true, code: 'WELCOME10', discountPercent: 10 } });
    await waitFor(() => expect(screen.getByText(/Royal Oud/)).toBeInTheDocument());

    expect(await screen.findByText(/Discount \(10%/)).toBeInTheDocument();
    // The applied-code row (with its Remove control) sits alongside the total.
    expect(screen.getByText(/applied/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => expect(screen.queryByText(/Discount \(10%/)).not.toBeInTheDocument());
    expect(localStorage.getItem('herencia.discountCode')).toBeNull();
    expect(screen.getByRole('button', { name: /have a discount code/i })).toBeInTheDocument();
  });
});
