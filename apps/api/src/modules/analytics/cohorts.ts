import type { AnalyticsCohortsDTO } from '@herencia/shared';
import { Order } from '../../models/Order';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Cohorts keyed on the customer phone number.
 *
 * Guest checkout is the norm here, so an account-based definition would measure a
 * small and unrepresentative slice. `createOrderSchema` already normalises every
 * phone on write (decision #44), so plain equality groups a customer correctly no
 * matter which format they typed.
 *
 * "New" means the customer's earliest non-cancelled order falls inside the range;
 * anyone with an earlier order is "returning". Cancelled orders are excluded
 * throughout, matching the /api/admin/stats convention.
 */
export async function computeCohorts(start: Date, end: Date): Promise<AnalyticsCohortsDTO> {
  const inRange = { $and: [{ $gte: ['$createdAt', start] }, { $lte: ['$createdAt', end] }] };

  const rows = await Order.aggregate<{
    _id: string;
    firstOrderAt: Date;
    inRangeCount: number;
    inRangeRevenue: number;
    lifetimeRevenue: number;
    lifetimeCount: number;
  }>([
    { $match: { status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: '$customer.phone',
        firstOrderAt: { $min: '$createdAt' },
        lifetimeRevenue: { $sum: '$total' },
        lifetimeCount: { $sum: 1 },
        inRangeCount: { $sum: { $cond: [inRange, 1, 0] } },
        inRangeRevenue: { $sum: { $cond: [inRange, '$total', 0] } },
      },
    },
    // Only customers who actually ordered in the window belong to this report.
    { $match: { inRangeCount: { $gt: 0 } } },
  ]);

  if (rows.length === 0) {
    return {
      newCustomers: 0,
      returningCustomers: 0,
      repeatRate: 0,
      avgLtv: 0,
      firstOrderRevenue: 0,
      repeatOrderRevenue: 0,
    };
  }

  let newCustomers = 0;
  let returningCustomers = 0;
  let firstOrderRevenue = 0;
  let repeatOrderRevenue = 0;
  let repeatBuyers = 0;
  let lifetimeTotal = 0;

  for (const r of rows) {
    if (r.firstOrderAt >= start && r.firstOrderAt <= end) {
      newCustomers += 1;
      firstOrderRevenue += r.inRangeRevenue;
    } else {
      returningCustomers += 1;
      repeatOrderRevenue += r.inRangeRevenue;
    }
    if (r.lifetimeCount > 1) repeatBuyers += 1;
    lifetimeTotal += r.lifetimeRevenue;
  }

  return {
    newCustomers,
    returningCustomers,
    repeatRate: round2(repeatBuyers / rows.length),
    avgLtv: round2(lifetimeTotal / rows.length),
    firstOrderRevenue: round2(firstOrderRevenue),
    repeatOrderRevenue: round2(repeatOrderRevenue),
  };
}
