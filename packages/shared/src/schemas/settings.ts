import { z } from 'zod';

export const heroSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().min(1).max(300),
  ctaText: z.string().min(1).max(60),
  ctaLink: z.string().min(1).max(300),
  image: z.string().min(1).max(300),
});
export type HeroContent = z.infer<typeof heroSchema>;

export const homeSectionsSchema = z.object({
  hero: z.boolean(),
  values: z.boolean(),
  featured: z.boolean(),
  promo: z.boolean(),
  quiz: z.boolean(),
});
export type HomeSections = z.infer<typeof homeSectionsSchema>;

export const instapaySchema = z.object({
  enabled: z.boolean(),
  handle: z.string().max(120).optional(),
  qrImage: z.string().max(300).optional(),
});
export type InstaPaySettings = z.infer<typeof instapaySchema>;

export const socialLinksSchema = z
  .object({
    instagram: z.string().max(200).optional(),
    facebook: z.string().max(200).optional(),
    tiktok: z.string().max(200).optional(),
  })
  .partial();

// Admin update — every group optional so a partial save doesn't clobber siblings.
export const updateSettingsSchema = z.object({
  whatsappNumber: z.string().min(1).max(40).optional(),
  shippingFee: z.number().nonnegative().optional(),
  freeShippingThreshold: z.number().nonnegative().optional(),
  contactEmail: z.string().email().max(120).optional(),
  socialLinks: socialLinksSchema.optional(),
  hero: heroSchema.partial().optional(),
  homeSections: homeSectionsSchema.partial().optional(),
  instapay: instapaySchema.partial().optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export type SettingDTO = {
  whatsappNumber: string;
  shippingFee: number;
  freeShippingThreshold?: number;
  socialLinks: z.infer<typeof socialLinksSchema>;
  hero: HeroContent;
  homeSections: HomeSections;
  instapay: InstaPaySettings;
  contactEmail?: string;
};

export const DEFAULT_HOME_SECTIONS: HomeSections = {
  hero: true,
  values: true,
  featured: true,
  promo: true,
  quiz: true,
};
