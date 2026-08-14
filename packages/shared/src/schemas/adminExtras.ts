import { z } from 'zod';

// ---- Newsletter subscribers (admin view) ----
export type SubscriberDTO = {
  id: string;
  email: string;
  source: string;
  createdAt: string;
};

// ---- Customers (registered users + order aggregates) ----
export type CustomerDTO = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
};

// ---- Dashboard stats ----
export type AdminStatsDTO = {
  orders: number;
  revenue: number;
  orders30: number;
  revenue30: number;
  pending: number;
  // Counted server-side over the whole catalog (inactive products included) so
  // the dashboard never under-reports because of a client-side page limit.
  products: number;
  lowStock: number;
  outOfStock: number;
  bestSellers: { name: string; qty: number; revenue: number }[];
};

// ---- Discount codes ----
export const discountCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters')
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only')
    .transform((s) => s.toUpperCase()),
  percent: z.number().min(1, 'Minimum 1%').max(90, 'Maximum 90%'),
  isActive: z.boolean().default(true),
  // ISO date string or null to clear.
  expiresAt: z.string().datetime().nullable().optional(),
});
export type DiscountCodeInput = z.infer<typeof discountCodeSchema>;

export type DiscountCodeDTO = {
  id: string;
  code: string;
  percent: number;
  isActive: boolean;
  expiresAt?: string;
  uses: number;
  createdAt: string;
};

// Public preview at checkout: only what the client needs to show the discount.
export type DiscountPreviewDTO = { code: string; percent: number };

// ---- Analytics dashboard ----
export type AnalyticsFunnelDTO = {
  sessions: number;
  productViews: number;
  addToCarts: number;
  checkoutStarts: number;
  orders: number;
};

export type AnalyticsPointDTO = { date: string; sessions: number; orders: number; revenue: number };

export type AnalyticsSourceDTO = {
  /** utm_source, else the referrer host, else 'direct'. */
  source: string;
  medium?: string;
  campaign?: string;
  sessions: number;
  orders: number;
  revenue: number;
  /** orders ÷ sessions; 0 when there were no sessions. */
  conversion: number;
};

export type AnalyticsCohortsDTO = {
  newCustomers: number;
  returningCustomers: number;
  repeatRate: number;
  avgLtv: number;
  firstOrderRevenue: number;
  repeatOrderRevenue: number;
};

export type AnalyticsDTO = {
  range: { from: string; to: string };
  funnel: AnalyticsFunnelDTO;
  /** Same-length period immediately before the range, for comparison. */
  previous: AnalyticsFunnelDTO;
  series: AnalyticsPointDTO[];
  /** The comparison period's daily values, index-aligned with `series` for plotting. */
  previousSeries: AnalyticsPointDTO[];
  revenue: number;
  previousRevenue: number;
  aov: number;
  sources: AnalyticsSourceDTO[];
  cohorts: AnalyticsCohortsDTO;
};
