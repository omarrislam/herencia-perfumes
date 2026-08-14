import { Router } from 'express';
import { productQuerySchema, stockNotifySchema } from '@herencia/shared';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';
import { HttpError } from '../middleware/error';
import { toProductDTO, toScentFamilyDTO } from '../lib/serialize';
import { StockNotification } from '../models/StockNotification';
import { notifyLimiter } from '../middleware/rateLimit';

export const catalogRouter = Router();

catalogRouter.get('/scent-families', async (_req, res, next) => {
  try {
    const families = await ScentFamily.find().sort({ order: 1, name: 1 }).lean();
    res.json(families.map(toScentFamilyDTO));
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products', async (req, res, next) => {
  try {
    const parsed = productQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid query', 'invalid_query');
    const q = parsed.data;

    const filter: Record<string, unknown> = { isActive: true };
    if (q.type) filter.type = q.type;
    if (q.scentFamily) filter.scentFamily = q.scentFamily;
    if (q.gender) filter.gender = q.gender;
    if (q.concentration) filter.concentration = q.concentration;
    if (q.minPrice != null || q.maxPrice != null) {
      filter.basePrice = {
        ...(q.minPrice != null ? { $gte: q.minPrice } : {}),
        ...(q.maxPrice != null ? { $lte: q.maxPrice } : {}),
      };
    }
    if (q.q) filter.$text = { $search: q.q };
    if (q.featured) filter.isFeatured = true;
    if (q.samples) {
      filter.type = 'perfume';
      filter.sampleStock = { $gt: 0 };
    }

    const sortMap: Record<typeof q.sort, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      'price-asc': { basePrice: 1 },
      'price-desc': { basePrice: -1 },
      rating: { 'rating.avg': -1 },
    };

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort(sortMap[q.sort])
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate('scentFamily')
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      items: items.map((d) => toProductDTO(d)),
      total,
      page: q.page,
      pages: Math.max(1, Math.ceil(total / q.limit)),
    });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products/:slug', async (req, res, next) => {
  try {
    const doc = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('scentFamily')
      .populate('bundleItems.product')
      .lean();
    if (!doc) throw new HttpError(404, 'Product not found', 'not_found');
    res.json(toProductDTO(doc, { populateBundle: true }));
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products/:slug/related', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!product) throw new HttpError(404, 'Product not found', 'not_found');
    const related = await Product.find({
      _id: { $ne: product._id },
      isActive: true,
      scentFamily: product.scentFamily,
      type: product.type,
    })
      .limit(4)
      .populate('scentFamily')
      .lean();
    res.json(related.map((d) => toProductDTO(d)));
  } catch (err) {
    next(err);
  }
});

// Capture demand for a sold-out size instead of losing the visitor. Nothing is sent
// automatically — the owner works the list from Admin → Inventory over WhatsApp,
// consistent with decision #48.
catalogRouter.post('/products/:slug/notify', notifyLimiter, async (req, res, next) => {
  try {
    const parsed = stockNotifySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid request', 'invalid');
    }
    const { sizeLabel, phone, email } = parsed.data;

    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!product) throw new HttpError(404, 'Product not found', 'not_found');

    const size = product.sizes.find((s) => s.label === sizeLabel);
    if (!size) throw new HttpError(404, 'Size not found', 'not_found');
    // Nothing to wait for — tell the caller rather than silently storing a dead row.
    if (size.stock > 0) throw new HttpError(409, 'This size is in stock', 'in_stock');

    // Idempotent: asking twice is a repeat visit, not an error.
    await StockNotification.updateOne(
      { product: product._id, sizeLabel, phone },
      { $setOnInsert: { product: product._id, sizeLabel, phone }, $set: { email: email || undefined } },
      { upsert: true },
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
