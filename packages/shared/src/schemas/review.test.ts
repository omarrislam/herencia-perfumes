import { describe, it, expect } from 'vitest';
import { createReviewSchema, updateReviewSchema } from './review';

describe('review schemas', () => {
  it('accepts a valid review', () => {
    expect(createReviewSchema.safeParse({ rating: 5, title: 'Great', body: 'Lovely scent' }).success).toBe(true);
  });
  it('rejects rating out of range', () => {
    expect(createReviewSchema.safeParse({ rating: 6, body: 'x' }).success).toBe(false);
    expect(createReviewSchema.safeParse({ rating: 0, body: 'x' }).success).toBe(false);
  });
  it('rejects an empty body', () => {
    expect(createReviewSchema.safeParse({ rating: 4, body: '' }).success).toBe(false);
  });
  it('validates the moderation payload', () => {
    expect(updateReviewSchema.safeParse({ isApproved: true }).success).toBe(true);
    expect(updateReviewSchema.safeParse({ isApproved: 'yes' }).success).toBe(false);
  });
});
