import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const settingSchema = new Schema(
  {
    whatsappNumber: { type: String, required: true },
    shippingFee: { type: Number, required: true, default: 0 },
    freeShippingThreshold: { type: Number },
    socialLinks: { instagram: String, facebook: String, tiktok: String },
    hero: {
      title: { type: String, required: true },
      subtitle: { type: String, required: true },
      ctaText: { type: String, required: true },
      ctaLink: { type: String, required: true },
      image: { type: String, required: true },
    },
    homeSections: {
      hero: { type: Boolean, default: true },
      featured: { type: Boolean, default: true },
      samples: { type: Boolean, default: true },
      essence: { type: Boolean, default: true },
      gifting: { type: Boolean, default: true },
      time: { type: Boolean, default: true },
      testimonials: { type: Boolean, default: true },
      values: { type: Boolean, default: true },
      quiz: { type: Boolean, default: true },
      faq: { type: Boolean, default: true },
    },
    sectionOrder: { type: [String] },
    instapay: {
      enabled: { type: Boolean, default: false },
      handle: { type: String },
      payLink: { type: String },
      qrImage: { type: String },
    },
    emailPopup: {
      enabled: { type: Boolean, default: false },
      title: { type: String },
      text: { type: String },
      code: { type: String },
      discountPercent: { type: Number },
    },
    promoBar: {
      enabled: { type: Boolean, default: false },
      text: { type: String },
      ctaText: { type: String },
      ctaLink: { type: String },
    },
    contactEmail: { type: String },
  },
  { timestamps: true },
);

export type SettingDoc = InferSchemaType<typeof settingSchema>;
export const Setting =
  (mongoose.models.Setting as mongoose.Model<SettingDoc>) ??
  mongoose.model('Setting', settingSchema);
