import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';
import { AuthProvider } from '../auth/AuthContext';
import * as api from '../../lib/api';

function Probe() {
  const { items, count, addItem } = useCart();
  return (
    <div>
      <span>count:{count}</span>
      <button onClick={() => addItem({ productId: 'a'.repeat(24), sizeLabel: '50ml', qty: 1 })}>add</button>
      <span>items:{items.length}</span>
    </div>
  );
}

describe('CartContext (guest)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'no'));
    vi.spyOn(api, 'priceCart').mockResolvedValue({ items: [], subtotal: 0, shipping: 0, total: 0, hasUnavailable: false });
  });
  it('adds an item and persists to localStorage', async () => {
    render(<AuthProvider><CartProvider><Probe /></CartProvider></AuthProvider>);
    await waitFor(() => expect(screen.getByText('count:0')).toBeInTheDocument());
    await act(async () => { screen.getByText('add').click(); });
    await waitFor(() => expect(screen.getByText('count:1')).toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem('herencia.cart') || '[]')).toHaveLength(1);
  });
});
