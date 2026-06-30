import { z } from 'zod';

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
  user: { id: string; name: string };
  rating: number;
  title?: string;
  body: string;
  isApproved: boolean;
  createdAt: string;
};
