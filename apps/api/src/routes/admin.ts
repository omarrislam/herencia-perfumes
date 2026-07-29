import { Router } from 'express';
import { adminProductSchema, scentFamilySchema, slugify, updateOrderStatusSchema, updateOrderPaidSchema, adminUpdateOrderSchema, releaseStaleSchema, updateReviewSchema, quizQuestionSchema, bannerSchema, blogPostSchema, updateSettingsSchema, noteIconSchema, discountCodeSchema, ORDER_STATUS, ORDER_STATUS_TRANSITIONS, LOW_STOCK_THRESHOLD, STALE_UNPAID_HOURS, type OrderStatus } from '@herencia/shared';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { QuizQuestion } from '../models/QuizQuestion';
import { Banner } from '../models/Banner';
import { BlogPost } from '../models/BlogPost';
import { Setting } from '../models/Setting';
import { NoteIcon } from '../models/NoteIcon';
import { Subscriber } from '../models/Subscriber';
import { DiscountCode } from '../models/DiscountCode';
import { User } from '../models/User';
import { HttpError } from '../middleware/error';
import { requireAdmin } from '../middleware/requireAdmin';
import { isCloudinaryConfigured, signUploadParams } from '../lib/cloudinary';
import { toProductDTO, toScentFamilyDTO, toOrderDTO, toReviewDTO, toQuizQuestionAdminDTO, toBannerDTO, toBlogPostDTO, toSettingDTO, toNoteIconDTO, toSubscriberDTO, toDiscountCodeDTO } from '../lib/serialize';
import { sendStatusUpdate } from '../lib/waCloud';
import { recomputeProductRating } from '../modules/review/service';

export function adminRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  // ---- Settings (home CMS: hero, section toggles, InstaPay) ----
  router.put('/settings', async (req, res, next) => {
    try {
      const parsed = updateSettingsSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      // Flatten one level to dot-paths so a partial save doesn't clobber sibling
      // fields within hero / homeSections / instapay / socialLinks.
      const $set: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parsed.data)) {
        if (v === undefined) continue;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          for (const [k2, v2] of Object.entries(v)) {
            if (v2 !== undefined) $set[`${k}.${k2}`] = v2;
          }
        } else {
          $set[k] = v;
        }
      }
      const s = await Setting.findOneAndUpdate({}, { $set }, { new: true, upsert: true }).lean();
      res.json(toSettingDTO(s));
    } catch (err) {
      next(err);
    }
  });

  // ---- Scent families ----
  router.post('/scent-families', async (req, res, next) => {
    try {
      const parsed = scentFamilySchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await ScentFamily.create({ ...data, slug: data.slug ?? slugify(data.name) });
      res.status(201).json(toScentFamilyDTO(doc.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.put('/scent-families/:id', async (req, res, next) => {
    try {
      const parsed = scentFamilySchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await ScentFamily.findByIdAndUpdate(
        req.params['id'],
        { ...data, slug: data.slug ?? slugify(data.name) },
        { new: true },
      ).lean();
      if (!doc) throw new HttpError(404, 'Scent family not found', 'not_found');
      res.json(toScentFamilyDTO(doc));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/scent-families/:id', async (req, res, next) => {
    try {
      const inUse = await Product.countDocuments({ scentFamily: req.params['id'] });
      if (inUse > 0) throw new HttpError(409, 'Scent family is in use by products', 'conflict');
      const doc = await ScentFamily.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Scent family not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Products / bundles ----
  // Admin listing — unlike the public catalog this does NOT filter on isActive,
  // otherwise deactivating a product would hide it from the only UI that can
  // reactivate it. Paginated so the catalog can outgrow one page.
  router.get('/products', async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query['page'] ?? 1) || 1);
      const limit = Math.min(200, Math.max(1, Number(req.query['limit'] ?? 50) || 50));
      const filter: Record<string, unknown> = {};
      const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
      if (q) filter['name'] = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const [docs, total] = await Promise.all([
        Product.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('scentFamily')
          .lean(),
        Product.countDocuments(filter),
      ]);
      res.json({
        items: docs.map((d) => toProductDTO(d)),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/products', async (req, res, next) => {
    try {
      const parsed = adminProductSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await Product.create({ ...data, slug: data.slug ?? slugify(data.name) });
      const populated = await doc.populate('scentFamily');
      res.status(201).json(toProductDTO(populated.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.put('/products/:id', async (req, res, next) => {
    try {
      const parsed = adminProductSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await Product.findById(req.params['id']);
      if (!doc) throw new HttpError(404, 'Product not found', 'not_found');
      // Keep the existing slug unless one is explicitly sent — the form omits it,
      // and a rename must not silently break product URLs.
      doc.set({ ...data, slug: data.slug ?? doc.slug });
      await doc.save(); // re-runs pre('validate') → basePrice/slug
      const populated = await doc.populate('scentFamily');
      res.json(toProductDTO(populated.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/products/:id', async (req, res, next) => {
    try {
      const doc = await Product.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Product not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Note icons (custom fragrance-note images) ----
  router.post('/notes', async (req, res, next) => {
    try {
      const parsed = noteIconSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const name = parsed.data.name.toLowerCase().trim();
      // Upsert by name so re-uploading an icon simply replaces the image.
      const doc = await NoteIcon.findOneAndUpdate(
        { name },
        { name, image: parsed.data.image },
        { new: true, upsert: true },
      ).lean();
      res.status(201).json(toNoteIconDTO(doc));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/notes/:id', async (req, res, next) => {
    try {
      const doc = await NoteIcon.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Note icon not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Cloudinary signed upload ----
  router.post('/uploads/sign', (req, res, next) => {
    try {
      if (!isCloudinaryConfigured()) throw new HttpError(503, 'Image uploads are not configured', 'unconfigured');
      res.json(signUploadParams('herencia'));
    } catch (err) {
      next(err);
    }
  });

  // ---- Orders ----
  router.get('/orders', async (req, res, next) => {
    try {
      const status = req.query['status'];
      const filter: Record<string, unknown> = {};
      if (typeof status === 'string') {
        if (!ORDER_STATUS.includes(status as OrderStatus)) throw new HttpError(400, 'Invalid status', 'invalid');
        filter['status'] = status;
      }
      // Free-text search: order number, customer name, or phone.
      const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter['$or'] = [
          { orderNumber: rx },
          { 'customer.name': rx },
          { 'customer.phone': rx },
          { 'shippingAddress.phone': rx },
        ];
      }
      const page = Math.max(1, Number(req.query['page'] ?? 1) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 20) || 20));
      const [docs, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Order.countDocuments(filter),
      ]);
      res.json({ items: docs.map(toOrderDTO), total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
      next(err);
    }
  });

  router.put('/orders/:id/status', async (req, res, next) => {
    try {
      const parsed = updateOrderStatusSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const order = await Order.findById(req.params['id']);
      if (!order) throw new HttpError(404, 'Order not found', 'not_found');
      const from = order.status as OrderStatus;
      const to = parsed.data.status;
      if (from !== to && !ORDER_STATUS_TRANSITIONS[from].includes(to)) {
        throw new HttpError(422, `Cannot move an order from ${from} to ${to}`, 'invalid_transition');
      }
      order.status = to;
      if (from !== to) order.statusHistory.push({ status: to, at: new Date() });
      await order.save();
      // Cancelling puts the reserved units back on the shelf.
      if (from !== to && to === 'cancelled') await restoreStock(order.items);
      // WhatsApp status update via the official Cloud API (no-op unless configured).
      if (from !== to) await sendStatusUpdate(order, to);
      res.json(toOrderDTO(order.toObject()));
    } catch (err) {
      next(err);
    }
  });

  // Corrects the delivery details of a placed order (wrong phone, mistyped
  // address). Items and totals are deliberately immutable — stock was already
  // decremented against them.
  router.put('/orders/:id', async (req, res, next) => {
    try {
      const parsed = adminUpdateOrderSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const { customer, shippingAddress } = parsed.data;
      // Dot-paths so the sub-documents keep any field the form doesn't carry.
      const $set: Record<string, unknown> = {
        'customer.name': customer.name,
        'customer.phone': customer.phone,
        'shippingAddress.line1': shippingAddress.line1,
        'shippingAddress.city': shippingAddress.city,
        'shippingAddress.governorate': shippingAddress.governorate,
        'shippingAddress.phone': shippingAddress.phone,
      };
      const $unset: Record<string, 1> = {};
      if (shippingAddress.line2) $set['shippingAddress.line2'] = shippingAddress.line2;
      else $unset['shippingAddress.line2'] = 1;
      if (customer.email) $set['customer.email'] = customer.email;
      else $unset['customer.email'] = 1;
      const order = await Order.findByIdAndUpdate(
        req.params['id'],
        { $set, $unset },
        { new: true },
      ).lean();
      if (!order) throw new HttpError(404, 'Order not found', 'not_found');
      res.json(toOrderDTO(order));
    } catch (err) {
      next(err);
    }
  });

  // Marks an InstaPay transfer as received (or clears a mistaken mark).
  router.put('/orders/:id/paid', async (req, res, next) => {
    try {
      const parsed = updateOrderPaidSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const order = await Order.findByIdAndUpdate(
        req.params['id'],
        parsed.data.paid ? { paidAt: new Date() } : { $unset: { paidAt: 1 } },
        { new: true },
      ).lean();
      if (!order) throw new HttpError(404, 'Order not found', 'not_found');
      res.json(toOrderDTO(order));
    } catch (err) {
      next(err);
    }
  });

  // Counts InstaPay orders still unpaid past `hours` — their units are reserved
  // but the money never came.
  router.get('/orders/stale-unpaid', async (req, res, next) => {
    try {
      const hours = staleHours(req.query['hours']);
      const count = await Order.countDocuments(staleUnpaidFilter(hours));
      res.json({ count, hours });
    } catch (err) {
      next(err);
    }
  });

  // Cancels those orders in one sweep, which returns their stock. Owner-triggered
  // only — nothing here runs on a timer against a real customer's order.
  router.post('/orders/release-stale', async (req, res, next) => {
    try {
      const parsed = releaseStaleSchema.safeParse({ hours: staleHours(req.body?.hours) });
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const orders = await Order.find(staleUnpaidFilter(parsed.data.hours));
      for (const order of orders) {
        order.status = 'cancelled';
        order.statusHistory.push({ status: 'cancelled', at: new Date() });
        await order.save();
        await restoreStock(order.items);
      }
      res.json({ cancelled: orders.length });
    } catch (err) {
      next(err);
    }
  });

  // Permanently removes an order. Only a cancelled order can be deleted, so the
  // units it reserved have always been returned first (cancelling restores them;
  // deleting never did, which quietly ate inventory).
  router.delete('/orders/:id', async (req, res, next) => {
    try {
      const order = await Order.findById(req.params['id']).lean();
      if (!order) throw new HttpError(404, 'Order not found', 'not_found');
      if (order.status !== 'cancelled') {
        throw new HttpError(
          409,
          'Cancel this order first — cancelling returns its stock, deleting does not.',
          'cancel_before_delete',
        );
      }
      await Order.deleteOne({ _id: order._id });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Newsletter subscribers ----
  router.get('/subscribers', async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query['page'] ?? 1) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 50) || 50));
      const [docs, total] = await Promise.all([
        Subscriber.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Subscriber.countDocuments(),
      ]);
      res.json({ items: docs.map(toSubscriberDTO), total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
      next(err);
    }
  });

  // ---- Customers (registered users + order aggregates) ----
  router.get('/customers', async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query['page'] ?? 1) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 50) || 50));
      const filter = { role: 'customer' };
      const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        User.countDocuments(filter),
      ]);
      const agg = await Order.aggregate<{ _id: unknown; orderCount: number; totalSpent: number }>([
        { $match: { user: { $in: users.map((u) => u._id) }, status: { $ne: 'cancelled' } } },
        { $group: { _id: '$user', orderCount: { $sum: 1 }, totalSpent: { $sum: '$total' } } },
      ]);
      const byUser = new Map(agg.map((a) => [String(a._id), a]));
      res.json({
        items: users.map((u) => ({
          id: String(u._id),
          name: u.name,
          email: u.email,
          phone: u.phone ?? undefined,
          createdAt: (u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt)).toISOString(),
          orderCount: byUser.get(String(u._id))?.orderCount ?? 0,
          totalSpent: byUser.get(String(u._id))?.totalSpent ?? 0,
        })),
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
      });
    } catch (err) {
      next(err);
    }
  });

  // ---- Dashboard stats (cancelled orders excluded from revenue) ----
  router.get('/stats', async (_req, res, next) => {
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const notCancelled = { status: { $ne: 'cancelled' } };
      const sum = { _id: null, n: { $sum: 1 }, rev: { $sum: '$total' } };
      // Stock health is counted over the whole catalog (inactive included) so a
      // page limit in the admin UI can never under-report it. A perfume's sample
      // pool counts as its own line, matching the Inventory table.
      const stockCounts = Product.aggregate<{ _id: null; low: number; out: number }>([
        {
          $project: {
            units: {
              $concatArrays: [
                { $map: { input: '$sizes', as: 's', in: '$$s.stock' } },
                {
                  $cond: [
                    { $eq: ['$type', 'perfume'] },
                    [{ $ifNull: ['$sampleStock', 0] }],
                    [],
                  ],
                },
              ],
            },
          },
        },
        { $unwind: '$units' },
        {
          $group: {
            _id: null,
            low: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ['$units', 0] }, { $lte: ['$units', LOW_STOCK_THRESHOLD] }] },
                  1,
                  0,
                ],
              },
            },
            out: { $sum: { $cond: [{ $eq: ['$units', 0] }, 1, 0] } },
          },
        },
      ]);
      const [all, recent, pending, best, products, stock] = await Promise.all([
        Order.aggregate<{ n: number; rev: number }>([{ $match: notCancelled }, { $group: sum }]),
        Order.aggregate<{ n: number; rev: number }>([
          { $match: { ...notCancelled, createdAt: { $gte: since } } },
          { $group: sum },
        ]),
        // "Awaiting action" = InstaPay awaiting payment + confirmed awaiting shipment.
        Order.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
        Order.aggregate<{ _id: string; qty: number; revenue: number }>([
          { $match: notCancelled },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.name',
              qty: { $sum: '$items.qty' },
              revenue: { $sum: { $multiply: ['$items.qty', '$items.unitPrice'] } },
            },
          },
          { $sort: { qty: -1 } },
          { $limit: 5 },
        ]),
        Product.countDocuments({}),
        stockCounts,
      ]);
      res.json({
        orders: all[0]?.n ?? 0,
        revenue: all[0]?.rev ?? 0,
        orders30: recent[0]?.n ?? 0,
        revenue30: recent[0]?.rev ?? 0,
        pending,
        products,
        lowStock: stock[0]?.low ?? 0,
        outOfStock: stock[0]?.out ?? 0,
        bestSellers: best.map((b) => ({ name: b._id, qty: b.qty, revenue: b.revenue })),
      });
    } catch (err) {
      next(err);
    }
  });

  // ---- Discount codes ----
  router.get('/discounts', async (_req, res, next) => {
    try {
      const docs = await DiscountCode.find().sort({ createdAt: -1 }).lean();
      res.json(docs.map(toDiscountCodeDTO));
    } catch (err) {
      next(err);
    }
  });
  router.post('/discounts', async (req, res, next) => {
    try {
      const parsed = discountCodeSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const { expiresAt, ...data } = parsed.data;
      const doc = await DiscountCode.create({ ...data, ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}) });
      res.status(201).json(toDiscountCodeDTO(doc.toObject()));
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        return next(new HttpError(409, 'A code with that name already exists', 'conflict'));
      }
      next(err);
    }
  });
  router.put('/discounts/:id', async (req, res, next) => {
    try {
      const parsed = discountCodeSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const { expiresAt, ...data } = parsed.data;
      const doc = await DiscountCode.findByIdAndUpdate(
        req.params['id'],
        {
          $set: { ...data, ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}) },
          ...(expiresAt ? {} : { $unset: { expiresAt: 1 } }),
        },
        { new: true },
      ).lean();
      if (!doc) throw new HttpError(404, 'Discount code not found', 'not_found');
      res.json(toDiscountCodeDTO(doc));
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        return next(new HttpError(409, 'A code with that name already exists', 'conflict'));
      }
      next(err);
    }
  });
  router.delete('/discounts/:id', async (req, res, next) => {
    try {
      const doc = await DiscountCode.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Discount code not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Orders CSV export (honors the same status/q filters as the list) ----
  router.get('/orders-export', async (req, res, next) => {
    try {
      const status = req.query['status'];
      const filter: Record<string, unknown> = {};
      if (typeof status === 'string' && status) {
        if (!ORDER_STATUS.includes(status as OrderStatus)) throw new HttpError(400, 'Invalid status', 'invalid');
        filter['status'] = status;
      }
      const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter['$or'] = [
          { orderNumber: rx },
          { 'customer.name': rx },
          { 'customer.phone': rx },
          { 'shippingAddress.phone': rx },
        ];
      }
      const docs = await Order.find(filter).sort({ createdAt: -1 }).limit(5000).lean();
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const header = [
        'orderNumber', 'placedAt', 'status', 'payment', 'paidAt', 'customer', 'phone', 'email',
        'address', 'city', 'governorate', 'items', 'subtotal', 'shipping', 'discount', 'discountCode', 'total', 'notes',
      ].join(',');
      const rows = docs.map((o) =>
        [
          o.orderNumber,
          new Date(o.createdAt).toISOString(),
          o.status,
          o.paymentMethod ?? 'cod',
          o.paidAt ? new Date(o.paidAt).toISOString() : '',
          o.customer?.name ?? '',
          o.customer?.phone ?? '',
          o.customer?.email ?? '',
          o.shippingAddress?.line1 ?? '',
          o.shippingAddress?.city ?? '',
          o.shippingAddress?.governorate ?? '',
          (o.items ?? []).map((i) => `${i.name} x${i.qty} (${i.sizeLabel})`).join('; '),
          o.subtotal,
          o.shipping,
          o.discount ?? 0,
          o.discountCode ?? '',
          o.total,
          o.notes ?? '',
        ].map(esc).join(','),
      );
      res.setHeader('content-type', 'text/csv; charset=utf-8');
      res.setHeader('content-disposition', `attachment; filename="herencia-orders${typeof status === 'string' && status ? `-${status}` : ''}.csv"`);
      res.send([header, ...rows].join('\n'));
    } catch (err) {
      next(err);
    }
  });

  // ---- Reviews ----
  router.get('/reviews', async (req, res, next) => {
    try {
      const status = req.query['status'];
      const filter: Record<string, unknown> = {};
      if (status === 'pending') filter['isApproved'] = false;
      else if (status === 'approved') filter['isApproved'] = true;
      const page = Math.max(1, Number(req.query['page'] ?? 1) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 20) || 20));
      const [docs, total] = await Promise.all([
        Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name').lean(),
        Review.countDocuments(filter),
      ]);
      res.json({ items: docs.map(toReviewDTO), total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
      next(err);
    }
  });

  router.put('/reviews/:id', async (req, res, next) => {
    try {
      const parsed = updateReviewSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const doc = await Review.findByIdAndUpdate(req.params['id'], { isApproved: parsed.data.isApproved }, { new: true }).populate('user', 'name');
      if (!doc) throw new HttpError(404, 'Review not found', 'not_found');
      await recomputeProductRating(String(doc.product));
      res.json(toReviewDTO(doc.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/reviews/:id', async (req, res, next) => {
    try {
      const doc = await Review.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Review not found', 'not_found');
      await recomputeProductRating(String(doc.product));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Quiz ----
  router.get('/quiz', async (_req, res, next) => {
    try {
      const docs = await QuizQuestion.find().sort({ order: 1 }).lean();
      res.json(docs.map(toQuizQuestionAdminDTO));
    } catch (err) {
      next(err);
    }
  });
  router.post('/quiz', async (req, res, next) => {
    try {
      const parsed = quizQuestionSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const doc = await QuizQuestion.create(parsed.data);
      res.status(201).json(toQuizQuestionAdminDTO(doc.toObject()));
    } catch (err) {
      next(err);
    }
  });
  router.put('/quiz/:id', async (req, res, next) => {
    try {
      const parsed = quizQuestionSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const doc = await QuizQuestion.findByIdAndUpdate(req.params['id'], parsed.data, { new: true }).lean();
      if (!doc) throw new HttpError(404, 'Question not found', 'not_found');
      res.json(toQuizQuestionAdminDTO(doc));
    } catch (err) {
      next(err);
    }
  });
  router.delete('/quiz/:id', async (req, res, next) => {
    try {
      const doc = await QuizQuestion.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Question not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Banners ----
  router.get('/banners', async (_req, res, next) => {
    try {
      const docs = await Banner.find().sort({ order: 1, createdAt: -1 }).lean();
      res.json(docs.map(toBannerDTO));
    } catch (err) {
      next(err);
    }
  });
  router.post('/banners', async (req, res, next) => {
    try {
      const parsed = bannerSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const doc = await Banner.create(parsed.data);
      res.status(201).json(toBannerDTO(doc.toObject()));
    } catch (err) {
      next(err);
    }
  });
  router.put('/banners/:id', async (req, res, next) => {
    try {
      const parsed = bannerSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const doc = await Banner.findByIdAndUpdate(req.params['id'], parsed.data, { new: true }).lean();
      if (!doc) throw new HttpError(404, 'Banner not found', 'not_found');
      res.json(toBannerDTO(doc));
    } catch (err) {
      next(err);
    }
  });
  router.delete('/banners/:id', async (req, res, next) => {
    try {
      const doc = await Banner.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Banner not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Blog ----
  router.get('/blog', async (_req, res, next) => {
    try {
      const docs = await BlogPost.find().sort({ createdAt: -1 }).lean();
      res.json({ items: docs.map(toBlogPostDTO), total: docs.length, page: 1, pages: 1 });
    } catch (err) {
      next(err);
    }
  });
  router.post('/blog', async (req, res, next) => {
    try {
      const parsed = blogPostSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await BlogPost.create({
        ...data,
        slug: data.slug ? slugify(data.slug) : slugify(data.title),
        publishedAt: data.isPublished ? new Date() : undefined,
      });
      res.status(201).json(toBlogPostDTO(doc.toObject()));
    } catch (err) {
      next(err);
    }
  });
  router.put('/blog/:id', async (req, res, next) => {
    try {
      const parsed = blogPostSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const existing = await BlogPost.findById(req.params['id']);
      if (!existing) throw new HttpError(404, 'Post not found', 'not_found');
      const publishedAt = data.isPublished ? (existing.publishedAt ?? new Date()) : undefined;
      existing.set({ ...data, slug: data.slug ? slugify(data.slug) : slugify(data.title), publishedAt });
      await existing.save();
      res.json(toBlogPostDTO(existing.toObject()));
    } catch (err) {
      next(err);
    }
  });
  router.delete('/blog/:id', async (req, res, next) => {
    try {
      const doc = await BlogPost.findByIdAndDelete(req.params['id']).lean();
      if (!doc) throw new HttpError(404, 'Post not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

type StockLine = { product: unknown; sizeLabel: string; qty: number; isSample?: boolean | null };

/**
 * Returns an order's reserved units to the shelf. Fail-soft: a product or size
 * deleted since the order was placed simply matches nothing.
 */
async function restoreStock(items: StockLine[]): Promise<void> {
  for (const item of items) {
    if (item.isSample) {
      await Product.updateOne({ _id: item.product }, { $inc: { sampleStock: item.qty } });
    } else {
      await Product.updateOne(
        { _id: item.product, 'sizes.label': item.sizeLabel },
        { $inc: { 'sizes.$.stock': item.qty } },
      );
    }
  }
}

/** InstaPay, never marked paid, still awaiting payment, and older than `hours`. */
function staleUnpaidFilter(hours: number): Record<string, unknown> {
  return {
    paymentMethod: 'instapay',
    paidAt: { $exists: false },
    status: 'pending',
    createdAt: { $lte: new Date(Date.now() - hours * 60 * 60 * 1000) },
  };
}

function staleHours(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : STALE_UNPAID_HOURS;
}
