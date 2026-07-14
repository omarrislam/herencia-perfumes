import type { CreateOrderInput, CreateOrderResultDTO } from '@herencia/shared';
import { SAMPLE_SIZE_LABEL, DEFAULT_SAMPLES_SETTINGS } from '@herencia/shared';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';
import { Order } from '../../models/Order';
import { DiscountCode } from '../../models/DiscountCode';
import { HttpError } from '../../middleware/error';
import { priceItems } from '../cart/service';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import { generateOrderNumber } from '../../lib/orderNumber';
import { toOrderDTO } from '../../lib/serialize';
import { sendOrderReceipt } from '../../lib/waCloud';
import { sendNewOrderAlert } from '../../lib/ntfy';

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

  const setting = await Setting.findOne().lean();
  const sampleSizeLabel = setting?.samples?.sizeLabel ?? DEFAULT_SAMPLES_SETTINGS.sizeLabel;

  // Atomically decrement stock; roll back on any failure to avoid oversell.
  const decremented: { id: string; label: string; qty: number; isSample: boolean }[] = [];
  for (const line of priced.items) {
    const isSample = line.sizeLabel === SAMPLE_SIZE_LABEL;
    const r = isSample
      ? await Product.updateOne(
          { _id: line.productId, sampleStock: { $gte: line.qty } },
          { $inc: { sampleStock: -line.qty } },
        )
      : await Product.updateOne(
          {
            _id: line.productId,
            sizes: { $elemMatch: { label: line.sizeLabel, stock: { $gte: line.qty } } },
          },
          { $inc: { 'sizes.$.stock': -line.qty } },
        );
    if (r.modifiedCount !== 1) {
      await rollback(decremented);
      throw new HttpError(
        409,
        'Stock changed during checkout, please review your cart',
        'stock_conflict',
      );
    }
    decremented.push({ id: line.productId, label: line.sizeLabel, qty: line.qty, isSample });
  }

  try {
    // Discounts are always computed server-side, never trusted from the client.
    // The email-popup code (settings) wins; otherwise look up admin-managed codes.
    const popup = setting?.emailPopup;
    const codeValid =
      !!input.discountCode &&
      !!popup?.enabled &&
      !!popup.code &&
      !!popup.discountPercent &&
      input.discountCode.trim().toUpperCase() === popup.code.trim().toUpperCase();
    let discount = 0;
    let appliedCode: string | undefined;
    if (codeValid) {
      discount = Math.round(priced.subtotal * (popup!.discountPercent! / 100) * 100) / 100;
      appliedCode = popup!.code ?? undefined;
    } else if (input.discountCode) {
      const dc = await DiscountCode.findOne({
        code: input.discountCode.trim().toUpperCase(),
        isActive: true,
      }).lean();
      if (dc && (!dc.expiresAt || new Date(dc.expiresAt) > new Date())) {
        discount = Math.round(priced.subtotal * (dc.percent / 100) * 100) / 100;
        appliedCode = dc.code;
        await DiscountCode.updateOne({ _id: dc._id }, { $inc: { uses: 1 } });
      }
    }

    const doc = await Order.create({
      orderNumber: generateOrderNumber(),
      items: priced.items.map((l) => ({
        product: l.productId,
        name: l.name,
        sizeLabel: l.sizeLabel === SAMPLE_SIZE_LABEL ? `Sample · ${sampleSizeLabel}` : l.sizeLabel,
        unitPrice: l.unitPrice,
        qty: l.qty,
        image: l.image,
        isSample: l.sizeLabel === SAMPLE_SIZE_LABEL || undefined,
      })),
      customer: input.customer,
      shippingAddress: input.shippingAddress,
      subtotal: priced.subtotal,
      shipping: priced.shipping,
      discount,
      discountCode: appliedCode,
      total: Math.round((priced.total - discount) * 100) / 100,
      // COD has no payment step — it's confirmed the moment it's placed.
      // InstaPay stays pending until the transfer is marked received.
      status: (input.paymentMethod ?? 'cod') === 'instapay' ? 'pending' : 'confirmed',
      statusHistory: [
        { status: (input.paymentMethod ?? 'cod') === 'instapay' ? 'pending' : 'confirmed', at: new Date() },
      ],
      paymentMethod: input.paymentMethod ?? 'cod',
      notes: input.notes,
      user: userId,
    });

    const order = toOrderDTO(doc.toObject());
    const whatsappUrl = buildWhatsAppUrl(setting?.whatsappNumber ?? '', order);
    // WhatsApp receipt via the official Cloud API (no-op unless configured).
    await sendOrderReceipt(doc, setting?.instapay);
    // Owner push notification via ntfy.sh (no-op unless configured).
    await sendNewOrderAlert(doc);
    return { order, whatsappUrl };
  } catch (err) {
    await rollback(decremented);
    throw err;
  }
}

async function rollback(
  decremented: { id: string; label: string; qty: number; isSample: boolean }[],
): Promise<void> {
  for (const d of decremented) {
    if (d.isSample) {
      await Product.updateOne({ _id: d.id }, { $inc: { sampleStock: d.qty } });
    } else {
      await Product.updateOne(
        { _id: d.id, 'sizes.label': d.label },
        { $inc: { 'sizes.$.stock': d.qty } },
      );
    }
  }
}
