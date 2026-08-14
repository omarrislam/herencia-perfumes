import mongoose, { Schema, type InferSchemaType } from 'mongoose';

// Someone who asked to hear when a sold-out size comes back. The owner works the
// list manually over WhatsApp — nothing here sends anything automatically
// (decisions #48/#49: no channel exists that can reach everyone unattended).
const stockNotificationSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    sizeLabel: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    notified: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// One request per person per size — asking twice must not create a second row.
stockNotificationSchema.index({ product: 1, sizeLabel: 1, phone: 1 }, { unique: true });

export type StockNotificationDoc = InferSchemaType<typeof stockNotificationSchema>;
export const StockNotification =
  (mongoose.models.StockNotification as mongoose.Model<StockNotificationDoc>) ??
  mongoose.model('StockNotification', stockNotificationSchema);
