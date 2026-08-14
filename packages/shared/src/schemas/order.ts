import { z } from 'zod';
import { ORDER_STATUS, PAYMENT_METHOD, type OrderStatus, type PaymentMethod } from '../enums';
import type { AttributionDTO } from './analytics';

export { ORDER_STATUS, type OrderStatus } from '../enums';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'invalid id');

// Egyptian mobile number — accepts 01XXXXXXXXX, +201XXXXXXXXX, 201XXXXXXXXX and
// spacing/dash variants; normalizes to the local 01XXXXXXXXX form for storage.
export const egyptianPhoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .transform((s) => {
    let d = s.replace(/[^\d]/g, '');
    if (d.startsWith('20') && d.length === 12) d = `0${d.slice(2)}`;
    return d;
  })
  .refine((d) => /^01[0125]\d{8}$/.test(d), {
    message: 'Enter a valid Egyptian mobile number, e.g. 01012345678',
  });

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        sizeLabel: z.string().min(1),
        qty: z.number().int().min(1),
      }),
    )
    .min(1, 'Your cart is empty'),
  customer: z.object({
    name: z.string().trim().min(1, 'Full name is required'),
    phone: egyptianPhoneSchema,
    email: z.string().email('Enter a valid email address').optional(),
  }),
  shippingAddress: z.object({
    line1: z.string().trim().min(1, 'Address is required'),
    line2: z.string().optional(),
    city: z.string().trim().min(1, 'City is required'),
    governorate: z.string().trim().min(1, 'Governorate is required'),
    phone: egyptianPhoneSchema,
  }),
  // Roomy cap — sample selections are appended here and the count is uncapped.
  notes: z.string().max(2000, 'Notes are too long (max 2000 characters)').optional(),
  paymentMethod: z.enum(PAYMENT_METHOD).optional(),
  // Validated server-side against the email-popup discount code; never trusted as an amount.
  discountCode: z.string().max(40).optional(),
  // Analytics correlation only — used to look the visitor's session up so the order
  // can carry its marketing attribution. Never used for pricing or identity.
  sessionId: z.string().trim().max(64).optional(),
  visitorId: z.string().trim().max(64).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const updateOrderStatusSchema = z.object({ status: z.enum(ORDER_STATUS) });
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// Admin correction of a placed order. Deliberately limited to the delivery
// details a phone call fixes — items and money are never editable after the
// fact (stock was already decremented against them).
export const adminUpdateOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1, 'Full name is required'),
    phone: egyptianPhoneSchema,
    email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  }),
  shippingAddress: z.object({
    line1: z.string().trim().min(1, 'Address is required'),
    line2: z.string().optional(),
    city: z.string().trim().min(1, 'City is required'),
    governorate: z.string().trim().min(1, 'Governorate is required'),
    phone: egyptianPhoneSchema,
  }),
});
export type AdminUpdateOrderInput = z.infer<typeof adminUpdateOrderSchema>;

// Guest order lookup: order number + the phone it was placed with. Both must
// match, so an order number alone never exposes a customer's address.
export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(4, 'Enter your order number').max(40),
  phone: egyptianPhoneSchema,
});
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;

// Owner-triggered release of stock held by abandoned unpaid InstaPay orders.
export const releaseStaleSchema = z.object({
  hours: z.number().int().min(1).max(24 * 30),
});
export type ReleaseStaleInput = z.infer<typeof releaseStaleSchema>;
export type StaleUnpaidDTO = { count: number; hours: number };
export type ReleaseStaleResultDTO = { cancelled: number };

// Marks an InstaPay transfer as received (or undoes a mistaken mark).
export const updateOrderPaidSchema = z.object({ paid: z.boolean() });
export type UpdateOrderPaidInput = z.infer<typeof updateOrderPaidSchema>;

export type OrderItemDTO = {
  product: string;
  name: string;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
  image: string;
  isSample?: boolean;
};
export type OrderDTO = {
  id: string;
  orderNumber: string;
  items: OrderItemDTO[];
  customer: { name: string; phone: string; email?: string };
  shippingAddress: { line1: string; line2?: string; city: string; governorate: string; phone: string };
  subtotal: number;
  shipping: number;
  discount: number;
  discountCode?: string;
  total: number;
  status: OrderStatus;
  /** Where this order came from. Absent on orders placed before analytics shipped. */
  attribution?: AttributionDTO;
  paymentMethod: PaymentMethod;
  paidAt?: string;
  statusHistory: { status: OrderStatus; at: string }[];
  notes?: string;
  createdAt: string;
};
export type CreateOrderResultDTO = { order: OrderDTO; whatsappUrl: string };
