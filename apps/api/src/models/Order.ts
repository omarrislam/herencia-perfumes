import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { ORDER_STATUS, PAYMENT_METHOD } from '@herencia/shared';

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sizeLabel: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    image: { type: String, default: '' },
    isSample: { type: Boolean },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    items: { type: [orderItemSchema], required: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
    },
    shippingAddress: {
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      governorate: { type: String, required: true },
      phone: { type: String, required: true },
    },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountCode: { type: String },
    total: { type: Number, required: true },
    status: { type: String, enum: [...ORDER_STATUS], default: 'pending', index: true },
    statusHistory: {
      type: [
        new Schema(
          {
            status: { type: String, enum: [...ORDER_STATUS], required: true },
            at: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    paymentMethod: { type: String, enum: [...PAYMENT_METHOD], default: 'cod' },
    paidAt: { type: Date },
    notes: { type: String },
    // Copied from the visitor's Session at creation. Kept on the order so revenue
    // attribution survives the 90-day raw-event TTL.
    attribution: {
      source: { type: String },
      medium: { type: String },
      campaign: { type: String },
      referrer: { type: String },
      landingPath: { type: String },
      sessionId: { type: String },
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true },
);

export type OrderDoc = InferSchemaType<typeof orderSchema>;
export const Order =
  (mongoose.models.Order as mongoose.Model<OrderDoc>) ?? mongoose.model('Order', orderSchema);
