import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { BANNER_PLACEMENT } from '@herencia/shared';

const bannerSchema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    image: { type: String, required: true },
    ctaText: { type: String },
    ctaLink: { type: String },
    placement: { type: String, enum: [...BANNER_PLACEMENT], required: true, index: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type BannerDoc = InferSchemaType<typeof bannerSchema>;
export const Banner =
  (mongoose.models.Banner as mongoose.Model<BannerDoc>) ?? mongoose.model('Banner', bannerSchema);
