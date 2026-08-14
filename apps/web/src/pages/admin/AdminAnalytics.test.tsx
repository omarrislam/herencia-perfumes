import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { AnalyticsDTO } from '@herencia/shared';
import AdminAnalytics from './AdminAnalytics';
import * as adminClient from '../../features/admin/adminClient';

const empty: AnalyticsDTO = {
  range: { from: '2026-07-16', to: '2026-08-14' },
  funnel: { sessions: 0, productViews: 0, addToCarts: 0, checkoutStarts: 0, orders: 0 },
  previous: { sessions: 0, productViews: 0, addToCarts: 0, checkoutStarts: 0, orders: 0 },
  series: [],
  previousSeries: [],
  revenue: 0,
  previousRevenue: 0,
  aov: 0,
  sources: [],
  cohorts: {
    newCustomers: 0, returningCustomers: 0, repeatRate: 0,
    avgLtv: 0, firstOrderRevenue: 0, repeatOrderRevenue: 0,
  },
};

const full: AnalyticsDTO = {
  ...empty,
  funnel: { sessions: 100, productViews: 60, addToCarts: 25, checkoutStarts: 10, orders: 4 },
  previous: { sessions: 80, productViews: 40, addToCarts: 20, checkoutStarts: 8, orders: 2 },
  series: [
    { date: '2026-08-13', sessions: 50, orders: 2, revenue: 1120 },
    { date: '2026-08-14', sessions: 50, orders: 2, revenue: 1120 },
  ],
  previousSeries: [
    { date: '2026-08-11', sessions: 40, orders: 1, revenue: 560 },
    { date: '2026-08-12', sessions: 40, orders: 1, revenue: 560 },
  ],
  revenue: 2240,
  previousRevenue: 1120,
  aov: 560,
  sources: [
    { source: 'instagram', medium: 'social', campaign: 'launch', sessions: 70, orders: 3, revenue: 1680, conversion: 0.04 },
    { source: 'direct', sessions: 30, orders: 1, revenue: 560, conversion: 0.03 },
  ],
  cohorts: {
    newCustomers: 3, returningCustomers: 1, repeatRate: 0.25,
    avgLtv: 700, firstOrderRevenue: 1680, repeatOrderRevenue: 560,
  },
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminAnalytics />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('AdminAnalytics', () => {
  beforeEach(() => {
    vi.spyOn(adminClient, 'adminFetchAnalytics').mockResolvedValue(full);
  });

  it('shows revenue, orders and average order value', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('EGP 2,240')).toBeInTheDocument());
    // "EGP 560" also appears in the chart's accessible data table, which is intended.
    expect(screen.getAllByText('EGP 560').length).toBeGreaterThan(0);
    expect(screen.getByText('Average order')).toBeInTheDocument();
  });

  it('renders every funnel step with its drop-off', async () => {
    renderPage();
    // "Visits" is also a column header in the sources table.
    await waitFor(() => expect(screen.getAllByText('Visits').length).toBeGreaterThan(0));
    expect(screen.getByText('Viewed a product')).toBeInTheDocument();
    expect(screen.getByText('Added to cart')).toBeInTheDocument();
    expect(screen.getByText('Started checkout')).toBeInTheDocument();
    expect(screen.getByText('Ordered')).toBeInTheDocument();
    // 60 of 100 visits viewed a product, so 40% dropped off at that step.
    expect(screen.getByText('−40%')).toBeInTheDocument();
  });

  it('lists traffic sources with campaign and revenue', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('instagram')).toBeInTheDocument());
    expect(screen.getByText('launch')).toBeInTheDocument();
    expect(screen.getByText('EGP 1,680')).toBeInTheDocument();
  });

  it('shows the trend against the comparison period with an arrow, not colour alone', async () => {
    renderPage();
    // Revenue doubled: 1120 -> 2240.
    // Both revenue and orders doubled, so the tile appears on each.
    await waitFor(() => expect(screen.getAllByText(/▲ 100% vs previous/).length).toBe(2));
  });

  it('shows cohort figures', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('New customers')).toBeInTheDocument());
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('shows empty states rather than blank panels for a new store', async () => {
    vi.spyOn(adminClient, 'adminFetchAnalytics').mockResolvedValue(empty);
    renderPage();
    await waitFor(() => expect(screen.getByText(/no visits recorded in this period/i)).toBeInTheDocument());
    expect(screen.getByText(/no traffic recorded in this period/i)).toBeInTheDocument();
    expect(screen.getByText(/no orders in this period/i)).toBeInTheDocument();
  });

  it('reports an error instead of rendering nothing', async () => {
    vi.spyOn(adminClient, 'adminFetchAnalytics').mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => expect(screen.getByText(/could not load analytics/i)).toBeInTheDocument());
  });
});
