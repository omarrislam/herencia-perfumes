import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'invalid id');

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        sizeLabel: z.string().min(1),
        qty: z.number().int().min(1),
      }),
    )
    .min(1),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(6),
    email: z.string().email().optional(),
  }),
  shippingAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    governorate: z.string().min(1),
    phone: z.string().min(6),
  }),
  notes: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
