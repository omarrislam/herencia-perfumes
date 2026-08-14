import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import { Review } from '../models/Review';
import { Subscriber } from '../models/Subscriber';
import { DiscountCode } from '../models/DiscountCode';
import { Product } from '../models/Product';
import { User } from '../models/User';

export type ResetCounts = {
  orders: number;
  carts: number;
  reviews: number;
  subscribers: number;
  /** Codes whose `uses` counter is non-zero and would be (or was) reset. */
  discountCodesReset: number;
  /** Products carrying a non-zero rating aggregate that would be (or was) cleared. */
  productRatingsCleared: number;
  /** Reported only — customer accounts are NOT deleted unless `deleteTestAccounts` is set. */
  customerAccounts: number;
  /** Customer accounts on the RFC-2606 reserved `example.com` domain. */
  testAccounts: number;
};

export type ResetReport = {
  dryRun: boolean;
  counts: ResetCounts;
};

/**
 * Clears transactional data so the store can launch from zero.
 *
 * Removes: orders, carts, reviews, subscribers. Zeroes: product rating aggregates,
 * discount-code `uses` counters.
 *
 * Deliberately preserves the catalog, settings, scent families, quiz, banners, and blog.
 * User accounts are preserved too, unless `deleteTestAccounts` is set — which removes
 * ONLY customer accounts on `example.com`, the domain RFC 2606 reserves for testing and
 * which therefore can never belong to a real customer. Admins are never deleted.
 *
 * This is NOT the seed script: `seed.ts` wipes products and settings, which must never
 * happen on a live store.
 */
export async function resetLaunchData(opts: {
  dryRun: boolean;
  deleteTestAccounts?: boolean;
}): Promise<ResetReport> {
  const ratedProducts = { $or: [{ 'rating.avg': { $gt: 0 } }, { 'rating.count': { $gt: 0 } }] };
  const usedCodes = { uses: { $gt: 0 } };
  const testAccounts = { role: 'customer', email: { $regex: /@example\.com$/i } };

  const counts: ResetCounts = {
    orders: await Order.countDocuments(),
    carts: await Cart.countDocuments(),
    reviews: await Review.countDocuments(),
    subscribers: await Subscriber.countDocuments(),
    discountCodesReset: await DiscountCode.countDocuments(usedCodes),
    productRatingsCleared: await Product.countDocuments(ratedProducts),
    customerAccounts: await User.countDocuments({ role: 'customer' }),
    testAccounts: await User.countDocuments(testAccounts),
  };

  if (opts.dryRun) return { dryRun: true, counts };

  await Order.deleteMany({});
  await Cart.deleteMany({});
  await Review.deleteMany({});
  await Subscriber.deleteMany({});
  await DiscountCode.updateMany(usedCodes, { $set: { uses: 0 } });
  await Product.updateMany(ratedProducts, { $set: { rating: { avg: 0, count: 0 } } });
  if (opts.deleteTestAccounts) await User.deleteMany(testAccounts);

  return { dryRun: false, counts };
}
