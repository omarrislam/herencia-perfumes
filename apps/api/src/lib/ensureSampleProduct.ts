import { SAMPLE_PRODUCT } from '@herencia/shared';
import { Product } from '../models/Product';

// Idempotently ensure the per-unit Perfume Sample product exists so the sample flow
// goes through the normal cart + checkout (qty = number of samples picked).
// Type 'sample' hides it from listings. Price is admin-editable in Products.
export async function ensureSampleProduct(): Promise<void> {
  try {
    const existing = await Product.findOne({ slug: SAMPLE_PRODUCT.slug });
    // If it exists, leave it alone — size label, price, and copy are the
    // admin's to edit in Products. (The one-time legacy "5 × 2ml box"
    // migration already ran; re-checking the label here used to RESET
    // admin edits on every boot.)
    if (existing) return;
    // Slug drifted (e.g. an explicit rename)? Re-attach the existing sample
    // instead of seeding a duplicate — the storefront looks it up by this slug.
    const drifted = await Product.findOne({ type: 'sample' });
    if (drifted) {
      await Product.updateOne({ _id: drifted._id }, { slug: SAMPLE_PRODUCT.slug });
      return;
    }
    await Product.create({
      name: 'Perfume Sample',
      slug: SAMPLE_PRODUCT.slug,
      type: 'sample',
      shortDesc: 'A 2ml sample — try before you commit.',
      description:
        'Hand-decanted 2ml samples from the HERENCIA collection. Pick the scents you want to try — the sample value is credited toward your full bottle when you buy.',
      images: ['/sample-choose.webp'],
      sizes: [{ label: SAMPLE_PRODUCT.sizeLabel, price: SAMPLE_PRODUCT.price, stock: 999999 }],
      gender: 'unisex',
      concentration: 'Other',
      isFeatured: false,
      isActive: true,
    });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) console.error('[api] ensureSampleProduct failed:', err);
  }
}
