import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { EVENT_TYPES } from '@herencia/shared';

/**
 * Raw events are disposable — only the Phase-2 daily rollups and `Order.attribution`
 * are permanent. The TTL is what keeps an unbounded collection inside a 512 MB tier.
 */
export const RAW_EVENT_TTL_SECONDS = 60 * 60 * 24 * 90;

const eventSchema = new Schema(
  {
    type: { type: String, enum: [...EVENT_TYPES], required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    visitorId: { type: String, required: true, index: true },
    path: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    // EGP. Always derived server-side — never read from the request body.
    value: { type: Number },
    orderNumber: { type: String },
    createdAt: { type: Date, default: Date.now, expires: RAW_EVENT_TTL_SECONDS, index: true },
  },
  { timestamps: false },
);

export type EventDoc = InferSchemaType<typeof eventSchema>;
export const Event =
  (mongoose.models.Event as mongoose.Model<EventDoc>) ?? mongoose.model('Event', eventSchema);
