import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const reviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String },
    body: { type: String, required: true },
    isApproved: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export type ReviewDoc = InferSchemaType<typeof reviewSchema>;
export const Review =
  (mongoose.models.Review as mongoose.Model<ReviewDoc>) ?? mongoose.model('Review', reviewSchema);
