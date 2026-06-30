import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'invalid id');

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(80),
  governorate: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(20),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;
export type AddressDTO = AddressInput & { id: string };

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const wishlistItemSchema = z.object({ productId: objectId });
export type WishlistItemInput = z.infer<typeof wishlistItemSchema>;
