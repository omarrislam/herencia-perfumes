import type { CartItemInput, PricedCartDTO, PricedCartLineDTO } from '@herencia/shared';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export async function priceItems(items: CartItemInput[]): Promise<PricedCartDTO> {
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines: PricedCartLineDTO[] = items.map((item) => {
    const p = byId.get(item.productId);
    const size = p?.sizes?.find((s) => s.label === item.sizeLabel);
    const active = !!p?.isActive;
    const maxQty = size?.stock ?? 0;
    const unitPrice = size?.price ?? 0;
    const available = active && !!size && item.qty <= maxQty && maxQty > 0;
    return {
      productId: item.productId,
      slug: p?.slug ?? '',
      name: p?.name ?? 'Unavailable item',
      image: p?.images?.[0] ?? '',
      sizeLabel: item.sizeLabel,
      unitPrice,
      qty: item.qty,
      lineTotal: available ? round2(unitPrice * item.qty) : 0,
      available,
      maxQty,
    };
  });

  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const setting = await Setting.findOne().lean();
  const fee = setting?.shippingFee ?? 0;
  const threshold = setting?.freeShippingThreshold;
  const shipping =
    subtotal === 0 ? 0 : threshold != null && subtotal >= threshold ? 0 : fee;
  return {
    items: lines,
    subtotal,
    shipping,
    total: round2(subtotal + shipping),
    hasUnavailable: lines.some((l) => !l.available),
  };
}
