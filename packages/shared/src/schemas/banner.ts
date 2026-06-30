import { z } from 'zod';
import { BANNER_PLACEMENT, BannerPlacement } from '../enums';

export { BANNER_PLACEMENT, BannerPlacement };

export const bannerSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(200).optional(),
  image: z.string().trim().min(1),
  ctaText: z.string().trim().max(40).optional(),
  ctaLink: z.string().trim().max(300).optional(),
  placement: z.enum(BANNER_PLACEMENT),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});
export type BannerInput = z.infer<typeof bannerSchema>;

export type BannerDTO = {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  ctaText?: string;
  ctaLink?: string;
  placement: (typeof BANNER_PLACEMENT)[number];
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  order: number;
};
