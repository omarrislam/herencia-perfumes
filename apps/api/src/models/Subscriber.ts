import mongoose, { Schema, type InferSchemaType } from 'mongoose';

// Email captured by the discount popup (and any future newsletter form).
const subscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: 'popup' },
  },
  { timestamps: true },
);

export type SubscriberDoc = InferSchemaType<typeof subscriberSchema>;
export const Subscriber =
  (mongoose.models.Subscriber as mongoose.Model<SubscriberDoc>) ??
  mongoose.model('Subscriber', subscriberSchema);
