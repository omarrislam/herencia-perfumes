import { z } from 'zod';
import { egyptianPhoneSchema } from './order';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().min(1).max(2000),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({ isApproved: z.boolean() });
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export type ReviewDTO = {
  id: string;
  productId: string;
  /** `id` is absent for a verified-guest review — they have no account. */
  user: { id?: string; name: string };
  /** True when the review is tied to a real order rather than an account. */
  verifiedBuyer?: boolean;
  rating: number;
  title?: string;
  body: string;
  isApproved: boolean;
  createdAt: string;
};

// A guest review, proven by the order it came from. Guest checkout is the norm here,
// so requiring an account meant almost nobody could review at all. The order
// number + phone pair is the same proof-of-purchase used by order tracking
// (decision #51) — no account, but every review is a verified buyer.
export const verifiedReviewSchema = createReviewSchema.extend({
  orderNumber: z.string().trim().min(4, 'Enter your order number').max(40),
  phone: egyptianPhoneSchema,
});
export type VerifiedReviewInput = z.infer<typeof verifiedReviewSchema>;
