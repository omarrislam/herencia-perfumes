import type { CartItemInput, PricedCartDTO, PricedCartLineDTO } from '@herencia/shared';
import { SAMPLE_SIZE_LABEL, DEFAULT_SAMPLES_SETTINGS } from '@herencia/shared';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export async function priceItems(items: CartItemInput[]): Promise<PricedCartDTO> {
  const ids = [...new Set(items.map((i) => i.productId))];
  const [products, setting] = await Promise.all([
    Product.find({ _id: { $in: ids } }).lean(),
    Setting.findOne().lean(),
  ]);
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const samplePrice = setting?.samples?.price ?? DEFAULT_SAMPLES_SETTINGS.price;

  const lines: PricedCartLineDTO[] = items.map((item) => {
    const p = byId.get(item.productId);
    const active = !!p?.isActive;

    if (item.sizeLabel === SAMPLE_SIZE_LABEL) {
      // Per-perfume sample: price is global (settings), stock is the perfume's
      // sampleStock. Only active perfumes can offer samples.
      const maxQty = p?.type === 'perfume' && active ? (p?.sampleStock ?? 0) : 0;
      const available = item.qty <= maxQty && maxQty > 0;
      return {
        productId: item.productId,
        slug: p?.slug ?? '',
        name: p?.name ?? 'Unavailable item',
        image: p?.images?.[0] ?? '',
        sizeLabel: SAMPLE_SIZE_LABEL,
        unitPrice: samplePrice,
        qty: item.qty,
        lineTotal: available ? round2(samplePrice * item.qty) : 0,
        available,
        maxQty,
      };
    }

    const size = p?.sizes?.find((s) => s.label === item.sizeLabel);
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
