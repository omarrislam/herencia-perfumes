import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const reviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    // Optional: guest checkout is the norm here, so most reviewers have no account.
    // A guest proves the purchase with an order number + phone instead (see below).
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    // Set for guest reviews — the order that proves they actually bought it.
    orderNumber: { type: String },
    // Display name for a guest review, taken from the order's customer name.
    guestName: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String },
    body: { type: String, required: true },
    isApproved: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// One review per account per product. Partial so the many guest reviews — which have
// no `user` — don't all collide on a single null key.
reviewSchema.index(
  { product: 1, user: 1 },
  { unique: true, partialFilterExpression: { user: { $exists: true } } },
);
// One review per ORDER per product: an order number is the guest's identity, so this
// is what stops someone replaying the same purchase to post repeatedly.
reviewSchema.index(
  { product: 1, orderNumber: 1 },
  { unique: true, partialFilterExpression: { orderNumber: { $exists: true } } },
);

export type ReviewDoc = InferSchemaType<typeof reviewSchema>;
export const Review =
  (mongoose.models.Review as mongoose.Model<ReviewDoc>) ?? mongoose.model('Review', reviewSchema);
