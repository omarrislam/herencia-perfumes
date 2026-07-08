import type { CreateOrderInput, CreateOrderResultDTO } from '@herencia/shared';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';
import { Order } from '../../models/Order';
import { HttpError } from '../../middleware/error';
import { priceItems } from '../cart/service';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import { generateOrderNumber } from '../../lib/orderNumber';
import { toOrderDTO } from '../../lib/serialize';
import { sendOrderReceipt } from '../../lib/waCloud';

export async function createOrder(
  input: CreateOrderInput,
  userId?: string,
): Promise<CreateOrderResultDTO> {
  const priced = await priceItems(input.items);
  if (priced.hasUnavailable || priced.items.length === 0) {
    throw new HttpError(409, 'Some items are unavailable or out of stock', 'cart_unavailable', {
      items: priced.items.filter((i) => !i.available),
    });
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

  try {
    const setting = await Setting.findOne().lean();

    // Email-popup discount — validated against settings, never the client amount.
    const popup = setting?.emailPopup;
    const codeValid =
      !!input.discountCode &&
      !!popup?.enabled &&
      !!popup.code &&
      !!popup.discountPercent &&
      input.discountCode.trim().toUpperCase() === popup.code.trim().toUpperCase();
    const discount = codeValid
      ? Math.round(priced.subtotal * (popup!.discountPercent! / 100) * 100) / 100
      : 0;

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
      discount,
      discountCode: codeValid ? popup!.code : undefined,
      total: Math.round((priced.total - discount) * 100) / 100,
      status: 'pending',
      paymentMethod: input.paymentMethod ?? 'cod',
      notes: input.notes,
      user: userId,
    });

    const order = toOrderDTO(doc.toObject());
    const whatsappUrl = buildWhatsAppUrl(setting?.whatsappNumber ?? '', order);
    // WhatsApp receipt via the official Cloud API (no-op unless configured).
    await sendOrderReceipt(doc, setting?.instapay);
    return { order, whatsappUrl };
  } catch (err) {
    for (const d of decremented) {
      await Product.updateOne(
        { _id: d.id, 'sizes.label': d.label },
        { $inc: { 'sizes.$.stock': d.qty } },
      );
    }
    throw err;
  }
}
