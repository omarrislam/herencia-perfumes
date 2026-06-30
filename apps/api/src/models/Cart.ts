import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: [
      {
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        sizeLabel: { type: String, required: true },
        qty: { type: Number, required: true, min: 1 },
      },
    ],
  },
  { timestamps: true },
);

export type CartDoc = InferSchemaType<typeof cartSchema>;
export const Cart =
  (mongoose.models.Cart as mongoose.Model<CartDoc>) ?? mongoose.model('Cart', cartSchema);
