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
  featured: z.boolean(),
  samples: z.boolean(),
  essence: z.boolean(),
  gifting: z.boolean(),
  time: z.boolean(),
  testimonials: z.boolean(),
  values: z.boolean(),
  quiz: z.boolean(),
  faq: z.boolean(),
});
export type HomeSections = z.infer<typeof homeSectionsSchema>;

// Order of the re-orderable (contained) home sections. Hero is fixed first.
// Sales-first default: products, then the sample path, then the editorial story.
export const REORDERABLE_SECTIONS = ['featured', 'samples', 'essence', 'gifting', 'time', 'testimonials', 'values', 'quiz', 'faq'] as const;
export type ReorderableSection = (typeof REORDERABLE_SECTIONS)[number];
export const DEFAULT_SECTION_ORDER: ReorderableSection[] = [...REORDERABLE_SECTIONS];
export const sectionOrderSchema = z.array(z.enum(REORDERABLE_SECTIONS));

export const instapaySchema = z.object({
  enabled: z.boolean(),
  handle: z.string().max(120).optional(),
  // Payment link shown on the confirmation page (simpler than a QR).
  payLink: z.string().max(300).optional(),
  qrImage: z.string().max(300).optional(),
});
export type InstaPaySettings = z.infer<typeof instapaySchema>;

// Email-capture popup that grants a storewide discount code.
export const emailPopupSchema = z.object({
  enabled: z.boolean(),
  title: z.string().max(80).optional(),
  text: z.string().max(200).optional(),
  code: z.string().max(40).optional(),
  discountPercent: z.number().min(1).max(90).optional(),
});
export type EmailPopupSettings = z.infer<typeof emailPopupSchema>;

// Top announcement / promo bar (above the navbar), managed in Admin → Home.
export const promoBarSchema = z.object({
  enabled: z.boolean(),
  text: z.string().max(160).optional(),
  ctaText: z.string().max(40).optional(),
  ctaLink: z.string().max(300).optional(),
});
export type PromoBarSettings = z.infer<typeof promoBarSchema>;

// Samples program — global price/size + every user-facing string of the home
// samples section and the sample modal. {price}/{size} tokens are interpolated.
export const samplesSettingsSchema = z.object({
  price: z.number().positive(),
  sizeLabel: z.string().min(1).max(20),
  eyebrow: z.string().min(1).max(80),
  heading: z.string().min(1).max(120),
  strapline: z.string().min(1).max(200),
  steps: z.tuple([z.string().min(1).max(120), z.string().min(1).max(120), z.string().min(1).max(120)]),
  ctaText: z.string().min(1).max(80),
  stickerTop: z.string().min(1).max(40),
  stickerBottom: z.string().min(1).max(40),
  modalTitle: z.string().min(1).max(80),
  modalText: z.string().min(1).max(300),
});
export type SamplesSettings = z.infer<typeof samplesSettingsSchema>;

export const DEFAULT_SAMPLES_SETTINGS: SamplesSettings = {
  price: 60,
  sizeLabel: '5ml',
  eyebrow: 'Try before you commit',
  heading: 'Samples first.\nBottles later.',
  strapline: 'Any scent · {size} vial · {price} each — credited back when you buy the bottle.',
  steps: [
    'Pick any scents from the collection',
    'Wear each one for a full day',
    'Sample price credited to your bottle',
  ],
  ctaText: 'Order samples · {price} each',
  stickerTop: '{size} from',
  stickerBottom: 'per sample',
  modalTitle: 'Order samples',
  modalText: 'Pick as many as you like · {size} each · {price} per sample. The value is credited when you buy the bottle.',
};

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
  sectionOrder: sectionOrderSchema.optional(),
  instapay: instapaySchema.partial().optional(),
  promoBar: promoBarSchema.partial().optional(),
  emailPopup: emailPopupSchema.partial().optional(),
  samples: samplesSettingsSchema.partial().optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export type SettingDTO = {
  whatsappNumber: string;
  shippingFee: number;
  freeShippingThreshold?: number;
  socialLinks: z.infer<typeof socialLinksSchema>;
  hero: HeroContent;
  homeSections: HomeSections;
  sectionOrder: ReorderableSection[];
  instapay: InstaPaySettings;
  promoBar: PromoBarSettings;
  emailPopup: EmailPopupSettings;
  samples: SamplesSettings;
  contactEmail?: string;
};

export const DEFAULT_HOME_SECTIONS: HomeSections = {
  hero: true,
  featured: true,
  samples: true,
  essence: true,
  gifting: true,
  time: true,
  testimonials: true,
  values: true,
  quiz: true,
  faq: true,
};
