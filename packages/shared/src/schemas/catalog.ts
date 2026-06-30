import { z } from 'zod';
import { CONCENTRATION, GENDER, PRODUCT_TYPE } from '../enums';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'invalid id');

// 2-decimal EGP money guard
const money = z
  .number()
  .nonnegative()
  .refine((n) => Math.round(n * 100) === n * 100, 'price must have at most 2 decimals');

export const PRODUCT_SORT = ['newest', 'price-asc', 'price-desc', 'rating'] as const;
export type ProductSort = (typeof PRODUCT_SORT)[number];

export const scentFamilySchema = z.object({
  name: z.string().min(1).max(60),
  slug: z.string().optional(),
  description: z.string().max(500).optional(),
  order: z.number().int().min(0).default(0),
});
export type ScentFamilyInput = z.infer<typeof scentFamilySchema>;

export const productSizeSchema = z.object({
  label: z.string().min(1).max(20),
  price: money,
  compareAtPrice: money.optional(),
  stock: z.number().int().min(0),
});

export const adminProductSchema = z
  .object({
    name: z.string().min(1).max(120),
    slug: z.string().optional(),
    type: z.enum(PRODUCT_TYPE),
    shortDesc: z.string().min(1).max(200),
    description: z.string().min(1),
    images: z.array(z.string().min(1)).min(1),
    sizes: z.array(productSizeSchema).min(1),
    scentFamily: objectId,
    notes: z.object({
      top: z.array(z.string().min(1)).default([]),
      heart: z.array(z.string().min(1)).default([]),
      base: z.array(z.string().min(1)).default([]),
    }),
    gender: z.enum(GENDER),
    concentration: z.enum(CONCENTRATION),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    seo: z.object({ title: z.string().optional(), description: z.string().optional() }).default({}),
    bundleItems: z.array(z.object({ product: objectId, qty: z.number().int().min(1) })).optional(),
  })
  .refine((p) => p.type !== 'bundle' || (p.bundleItems && p.bundleItems.length > 0), {
    message: 'bundle requires at least one bundleItem',
    path: ['bundleItems'],
  });
export type AdminProductInput = z.infer<typeof adminProductSchema>;

export const productQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  type: z.enum(PRODUCT_TYPE).optional(),
  scentFamily: objectId.optional(),
  gender: z.enum(GENDER).optional(),
  concentration: z.enum(CONCENTRATION).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(PRODUCT_SORT).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});
export type ProductQuery = z.infer<typeof productQuerySchema>;

// ---- Wire DTOs (API output shape; ids are strings) ----
export type ScentFamilyDTO = { id: string; name: string; slug: string; description?: string; order: number };
export type ProductSizeDTO = { label: string; price: number; compareAtPrice?: number; stock: number };
export type ProductDTO = {
  id: string;
  name: string;
  slug: string;
  type: (typeof PRODUCT_TYPE)[number];
  shortDesc: string;
  description: string;
  images: string[];
  sizes: ProductSizeDTO[];
  basePrice: number;
  scentFamily: ScentFamilyDTO | null;
  notes: { top: string[]; heart: string[]; base: string[] };
  gender: (typeof GENDER)[number];
  concentration: (typeof CONCENTRATION)[number];
  rating: { avg: number; count: number };
  isFeatured: boolean;
  isActive: boolean;
  seo: { title?: string; description?: string };
  bundleItems?: { product: ProductDTO | string; qty: number }[];
};
export type ProductListDTO = { items: ProductDTO[]; total: number; page: number; pages: number };
