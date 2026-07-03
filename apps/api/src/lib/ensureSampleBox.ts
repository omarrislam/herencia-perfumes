import { SAMPLE_BOX } from '@herencia/shared';
import { Product } from '../models/Product';

// Idempotently ensure the Sample Discovery Box product exists so the sample flow
// goes through the normal cart + checkout. Type 'sample' hides it from listings.
export async function ensureSampleBox(): Promise<void> {
  try {
    if (await Product.exists({ slug: SAMPLE_BOX.slug })) return;
    await Product.create({
      name: 'Sample Discovery Box',
      slug: SAMPLE_BOX.slug,
      type: 'sample',
      shortDesc: 'Five 2ml samples — try before you commit.',
      description:
        'Build your own discovery set of five 2ml samples from the HERENCIA collection. The full box value is credited toward your bottle when you buy.',
      images: ['/sample-choose.webp'],
      sizes: [{ label: SAMPLE_BOX.sizeLabel, price: SAMPLE_BOX.price, stock: 999999 }],
      gender: 'unisex',
      concentration: 'Other',
      isFeatured: false,
      isActive: true,
    });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) console.error('[api] ensureSampleBox failed:', err);
  }
}
