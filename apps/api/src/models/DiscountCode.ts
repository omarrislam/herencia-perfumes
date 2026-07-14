import mongoose, { Schema, type InferSchemaType } from 'mongoose';

// Admin-managed discount codes (the email-popup code remains separate in Settings
// and wins on conflict — see modules/order/service.ts).
const discountCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    percent: { type: Number, required: true, min: 1, max: 90 },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
    uses: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type DiscountCodeDoc = InferSchemaType<typeof discountCodeSchema>;
export const DiscountCode =
  (mongoose.models.DiscountCode as mongoose.Model<DiscountCodeDoc>) ??
  mongoose.model('DiscountCode', discountCodeSchema);
