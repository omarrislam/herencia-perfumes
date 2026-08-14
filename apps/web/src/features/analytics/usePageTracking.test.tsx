import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { usePageTracking } from './usePageTracking';
import * as analytics from '../../lib/analytics';

function Harness() {
  usePageTracking();
  const nav = useNavigate();
  return (
    <button type="button" onClick={() => nav('/products')}>
      go
    </button>
  );
}

beforeEach(() => {
  vi.spyOn(analytics, 'track').mockImplementation(() => {});
  vi.spyOn(analytics, 'flush').mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

function pageViews() {
  return (analytics.track as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(
    (c) => c[0] === 'page_view',
  );
}

describe('usePageTracking', () => {
  it('fires a page_view for the first render', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Harness />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(analytics.track).toHaveBeenCalledWith('page_view', { path: '/' });
  });

  it('fires another page_view on route change — a SPA never reloads', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Harness />} />
          <Route path="/products" element={<Harness />} />
        </Routes>
      </MemoryRouter>,
    );
    screen.getByText('go').click();
    await vi.waitFor(() =>
      expect(analytics.track).toHaveBeenCalledWith('page_view', { path: '/products' }),
    );
    expect(pageViews()).toHaveLength(2);
  });

  it('does not fire twice for the same path on a re-render', () => {
    const ui = (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Harness />} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(ui);
    rerender(ui);
    expect(pageViews()).toHaveLength(1);
  });
});
