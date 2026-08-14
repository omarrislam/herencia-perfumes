import mongoose, { Schema, type InferSchemaType } from 'mongoose';

// Permanent. Raw Event/Session documents expire after 90 days; these rollups are the
// long-range history, so they are deliberately given NO TTL.
const dailyStatSchema = new Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD (UTC)
    sessions: { type: Number, default: 0 },
    visitors: { type: Number, default: 0 },
    productViews: { type: Number, default: 0 },
    addToCarts: { type: Number, default: 0 },
    checkoutStarts: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    bySource: {
      type: [
        new Schema(
          {
            source: { type: String, required: true },
            medium: { type: String },
            campaign: { type: String },
            sessions: { type: Number, default: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export type DailyStatDoc = InferSchemaType<typeof dailyStatSchema>;
export const DailyStat =
  (mongoose.models.DailyStat as mongoose.Model<DailyStatDoc>) ??
  mongoose.model('DailyStat', dailyStatSchema);
