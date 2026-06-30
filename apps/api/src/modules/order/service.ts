import type { CreateOrderInput, CreateOrderResultDTO } from '@herencia/shared';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';
import { Order } from '../../models/Order';
import { HttpError } from '../../middleware/error';
import { priceItems } from '../cart/service';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import { generateOrderNumber } from '../../lib/orderNumber';
import { toOrderDTO } from '../../lib/serialize';

export async function createOrder(
  input: CreateOrderInput,
  userId?: string,
): Promise<CreateOrderResultDTO> {
  const priced = await priceItems(input.items);
  if (priced.hasUnavailable || priced.items.length === 0) {
    throw new HttpError(409, 'Some items are unavailable or out of stock', 'cart_unavailable');
  }

  // Atomically decrement stock; roll back on any failure to avoid oversell.
  const decremented: { id: string; label: string; qty: number }[] = [];
  for (const line of priced.items) {
    const r = await Product.updateOne(
      {
        _id: line.productId,
        sizes: { $elemMatch: { label: line.sizeLabel, stock: { $gte: line.qty } } },
      },
      { $inc: { 'sizes.$.stock': -line.qty } },
    );
    if (r.modifiedCount !== 1) {
      for (const d of decremented) {
        await Product.updateOne(
          { _id: d.id, 'sizes.label': d.label },
          { $inc: { 'sizes.$.stock': d.qty } },
        );
      }
      throw new HttpError(
        409,
        'Stock changed during checkout, please review your cart',
        'stock_conflict',
      );
    }
    decremented.push({ id: line.productId, label: line.sizeLabel, qty: line.qty });
  }

  const setting = await Setting.findOne().lean();
  const doc = await Order.create({
    orderNumber: generateOrderNumber(),
    items: priced.items.map((l) => ({
      product: l.productId,
      name: l.name,
      sizeLabel: l.sizeLabel,
      unitPrice: l.unitPrice,
      qty: l.qty,
      image: l.image,
    })),
    customer: input.customer,
    shippingAddress: input.shippingAddress,
    subtotal: priced.subtotal,
    shipping: priced.shipping,
    total: priced.total,
    status: 'pending',
    paymentMethod: 'cod',
    notes: input.notes,
    user: userId,
  });

  const order = toOrderDTO(doc.toObject());
  const whatsappUrl = buildWhatsAppUrl(setting?.whatsappNumber ?? '', order);
  return { order, whatsappUrl };
}
