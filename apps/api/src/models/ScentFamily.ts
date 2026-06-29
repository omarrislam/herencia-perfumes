import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const scentFamilySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type ScentFamilyDoc = InferSchemaType<typeof scentFamilySchema>;
export const ScentFamily =
  mongoose.models.ScentFamily ?? mongoose.model('ScentFamily', scentFamilySchema);
