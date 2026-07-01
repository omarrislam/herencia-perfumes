import mongoose from 'mongoose';
import { Review } from '../../models/Review';
import { Product } from '../../models/Product';

export async function recomputeProductRating(productId: string): Promise<void> {
  const agg = await Review.aggregate<{ _id: null; avg: number; count: number }>([
    { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const row = agg[0];
  const avg = row ? Math.round(row.avg * 10) / 10 : 0;
  const count = row?.count ?? 0;
  await Product.updateOne({ _id: productId }, { $set: { 'rating.avg': avg, 'rating.count': count } });
}
