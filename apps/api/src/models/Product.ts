import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { slugify } from '@herencia/shared';

const sizeSchema = new Schema(
  {
    label: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['perfume', 'bundle'], required: true, index: true },
    shortDesc: { type: String, required: true },
    description: { type: String, required: true },
    images: { type: [String], default: [] },
    sizes: { type: [sizeSchema], required: true },
    basePrice: { type: Number, required: true, index: true },
    scentFamily: { type: Schema.Types.ObjectId, ref: 'ScentFamily', required: true, index: true },
    notes: {
      top: { type: [String], default: [] },
      heart: { type: [String], default: [] },
      base: { type: [String], default: [] },
    },
    gender: { type: String, enum: ['men', 'women', 'unisex'], required: true, index: true },
    concentration: { type: String, enum: ['EDT', 'EDP', 'Extrait', 'Other'], required: true },
    rating: {
      avg: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    seo: { title: { type: String }, description: { type: String } },
    bundleItems: [
      {
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        qty: { type: Number, min: 1 },
      },
    ],
  },
  { timestamps: true },
);

productSchema.index({ name: 'text', shortDesc: 'text' });

productSchema.pre('validate', function (next) {
  const doc = this as unknown as { name: string; slug?: string; sizes: { price: number }[]; basePrice?: number };
  if (!doc.slug && doc.name) doc.slug = slugify(doc.name);
  if (Array.isArray(doc.sizes) && doc.sizes.length > 0) {
    doc.basePrice = Math.min(...doc.sizes.map((s) => s.price));
  }
  next();
});

export type ProductDoc = InferSchemaType<typeof productSchema>;
export const Product = mongoose.models.Product ?? mongoose.model('Product', productSchema);
