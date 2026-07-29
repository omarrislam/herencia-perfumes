import type { Types } from 'mongoose';
import type { CreateOrderInput, CreateOrderResultDTO } from '@herencia/shared';
import {
  SAMPLE_SIZE_LABEL,
  DEFAULT_SAMPLES_SETTINGS,
  LOW_STOCK_THRESHOLD,
  egyptianPhoneSchema,
} from '@herencia/shared';
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
import { sendNewOrderAlert, sendLowStockAlert, type LowStockLine } from '../../lib/ntfy';

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

  // Resolve the discount BEFORE touching stock: a rejected code must not leave
  // decremented units behind. The counter on an admin code is only incremented
  // once the order actually exists (below).
  const { discount, appliedCode, discountCodeId } = await resolveDiscount(
    input,
    priced.subtotal,
    setting?.emailPopup ?? undefined,
  );

  // Atomically decrement stock; roll back on any failure to avoid oversell.
  const decremented: { id: string; label: string; qty: number; isSample: boolean }[] = [];
  const lowStock: LowStockLine[] = [];
  for (const line of priced.items) {
    const isSample = line.sizeLabel === SAMPLE_SIZE_LABEL;
    // findOneAndUpdate (not updateOne) so the remaining count is known without a
    // second read — that is what the low-stock alert reports.
    const updated = isSample
      ? await Product.findOneAndUpdate(
          { _id: line.productId, sampleStock: { $gte: line.qty } },
          { $inc: { sampleStock: -line.qty } },
          { new: true },
        ).lean()
      : await Product.findOneAndUpdate(
          {
            _id: line.productId,
            sizes: { $elemMatch: { label: line.sizeLabel, stock: { $gte: line.qty } } },
          },
          { $inc: { 'sizes.$.stock': -line.qty } },
          { new: true },
        ).lean();
    if (!updated) {
      await rollback(decremented);
      throw new HttpError(
        409,
        'Stock changed during checkout, please review your cart',
        'stock_conflict',
      );
    }
    decremented.push({ id: line.productId, label: line.sizeLabel, qty: line.qty, isSample });
    const remaining = isSample
      ? (updated.sampleStock ?? 0)
      : (updated.sizes?.find((s) => s.label === line.sizeLabel)?.stock ?? 0);
    if (remaining <= LOW_STOCK_THRESHOLD) {
      lowStock.push({
        name: updated.name,
        sizeLabel: isSample ? `Sample · ${sampleSizeLabel}` : line.sizeLabel,
        remaining,
      });
    }
  }

  try {
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

    // The code's use counter only moves once the order is real.
    if (discountCodeId) await DiscountCode.updateOne({ _id: discountCodeId }, { $inc: { uses: 1 } });

    const order = toOrderDTO(doc.toObject());
    const whatsappUrl = buildWhatsAppUrl(setting?.whatsappNumber ?? '', order);
    // WhatsApp receipt via the official Cloud API (no-op unless configured).
    await sendOrderReceipt(doc, setting?.instapay);
    // Owner push notifications via ntfy.sh (both no-ops unless configured).
    await sendNewOrderAlert(doc);
    if (lowStock.length > 0) await sendLowStockAlert(lowStock);
    return { order, whatsappUrl };
  } catch (err) {
    await rollback(decremented);
    throw err;
  }
}

/**
 * Server-side discount resolution — the client's amount is never trusted.
 *
 * The email-popup code is a first-order offer, so it is honoured only for a
 * phone number that has never ordered before; admin-managed codes are one use
 * per phone number. Cancelled orders don't count against either (a refused COD
 * delivery shouldn't burn the customer's welcome discount). A code that fails
 * this check is rejected loudly rather than silently dropped, because checkout
 * has already shown the customer a discounted total.
 */
async function resolveDiscount(
  input: CreateOrderInput,
  subtotal: number,
  popup: { enabled?: boolean; code?: string | null; discountPercent?: number | null } | undefined,
): Promise<{ discount: number; appliedCode?: string; discountCodeId?: Types.ObjectId }> {
  const entered = input.discountCode?.trim().toUpperCase();
  if (!entered) return { discount: 0 };
  const phone = input.customer.phone;
  const pct = (percent: number) => Math.round(subtotal * (percent / 100) * 100) / 100;

  const popupUsable = !!popup?.enabled && !!popup.code && !!popup.discountPercent;
  if (popupUsable && entered === popup!.code!.trim().toUpperCase()) {
    const priorOrders = await Order.countDocuments({
      'customer.phone': phone,
      status: { $ne: 'cancelled' },
    });
    if (priorOrders > 0) {
      throw new HttpError(
        409,
        `${entered} is a welcome offer for your first order — remove the code to continue.`,
        'discount_not_eligible',
      );
    }
    return { discount: pct(popup!.discountPercent!), appliedCode: popup!.code ?? undefined };
  }

  const dc = await DiscountCode.findOne({ code: entered, isActive: true }).lean();
  if (!dc || (dc.expiresAt && new Date(dc.expiresAt) <= new Date())) return { discount: 0 };

  const alreadyUsed = await Order.countDocuments({
    'customer.phone': phone,
    discountCode: dc.code,
    status: { $ne: 'cancelled' },
  });
  if (alreadyUsed > 0) {
    throw new HttpError(
      409,
      `${dc.code} has already been used on a previous order — remove the code to continue.`,
      'discount_not_eligible',
    );
  }
  return { discount: pct(dc.percent), appliedCode: dc.code, discountCodeId: dc._id };
}

/**
 * Adopts orders placed as a guest into an account, matching on the phone or
 * email the order was placed with. Runs on register, login and profile save —
 * the phone usually only arrives with the profile, which is why login isn't
 * enough on its own. Never reassigns an order that already has an owner.
 */
export async function linkGuestOrders(
  userId: string,
  identity: { email?: string | null; phone?: string | null },
): Promise<number> {
  const match: Record<string, unknown>[] = [];
  if (identity.email) {
    const escaped = identity.email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    match.push({ 'customer.email': new RegExp(`^${escaped}$`, 'i') });
  }
  // Order phones are stored normalized (01XXXXXXXXX); a profile phone is free
  // text, so normalize it the same way or skip matching on it.
  const phone = identity.phone ? egyptianPhoneSchema.safeParse(identity.phone) : undefined;
  if (phone?.success) match.push({ 'customer.phone': phone.data });
  if (match.length === 0) return 0;

  // `user: null` matches both an explicit null and a missing field.
  const res = await Order.updateMany({ user: null, $or: match }, { $set: { user: userId } });
  return res.modifiedCount;
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
