import { z } from 'zod';
import { ORDER_STATUS, PAYMENT_METHOD, type OrderStatus, type PaymentMethod } from '../enums';

export { ORDER_STATUS, type OrderStatus } from '../enums';

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
  paymentMethod: z.enum(PAYMENT_METHOD).optional(),
  // Validated server-side against the email-popup discount code; never trusted as an amount.
  discountCode: z.string().max(40).optional(),
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

export type OrderItemDTO = {
  product: string;
  name: string;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
  image: string;
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
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
};
export type CreateOrderResultDTO = { order: OrderDTO; whatsappUrl: string };
